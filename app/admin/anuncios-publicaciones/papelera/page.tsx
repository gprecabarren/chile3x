import { and, count, desc, eq, inArray, isNotNull, like, or, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { adminAuditLogs, profileMedia, profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { AdminPageHeading, AdminShell } from "../../_components";
import { AdminPagination, pageHref, readAdminPage } from "../../pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;
const profileTypeLabels = { escort: "Escort", agency: "Agencia", rental: "Arriendo" };
const notices: Record<string, string> = {
  trashed: "El anuncio fue enviado a la papelera.", restored: "El anuncio fue restaurado.",
  deleted: "El anuncio y sus archivos asociados fueron eliminados definitivamente. El historial mínimo de la acción permanece en la bitácora.",
  escort_conflict: "No se puede restaurar: esta cuenta ya tiene otro anuncio Escort activo. Mueve el otro a la papelera antes de continuar.",
  storage_cleanup_failed: "El anuncio se borró de D1, pero falló la limpieza de algunos archivos R2. Revisa la alerta de almacenamiento en el panel operativo y la auditoría de archivos huérfanos.",
  not_found: "El anuncio ya no existe.", not_trashed: "El anuncio ya no está en la papelera.", already_trashed: "El anuncio ya estaba en la papelera.",
};

function chileDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`));
}

export default async function AdminProfileTrashPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string; origen?: string; autor?: string; page?: string; notice?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/anuncios-publicaciones/papelera");
  if (!adminHasCapability(admin, "profiles.recycle")) redirect("/admin/acceso-denegado?reason=permission");
  const [params, db] = await Promise.all([searchParams, getDb()]);
  const q = (params.q ?? "").trim().toLocaleLowerCase("es-CL").slice(0, 100);
  const type = params.tipo === "escort" || params.tipo === "agency" || params.tipo === "rental" ? params.tipo : "";
  const origin = params.origen === "self" || params.origen === "admin" ? params.origen : "";
  const author = (params.autor ?? "").trim().slice(0, 80);
  const conditions = [isNotNull(profiles.trashedAt)];
  if (type) conditions.push(eq(profiles.type, type));
  if (origin) conditions.push(eq(profiles.trashedByKind, origin));
  if (author) conditions.push(eq(profiles.trashedByAdminLogin, author));
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(or(
      like(sql`lower(${profiles.displayName})`, pattern),
      like(sql`lower(${users.email})`, pattern),
      like(sql`lower(coalesce(${profiles.handle}, ''))`, pattern),
      like(sql`lower(${profiles.id})`, pattern),
    )!);
  }
  const where = and(...conditions);
  const [[totalRow], authorRows] = await Promise.all([
    db.select({ total: count() }).from(profiles).innerJoin(users, eq(users.id, profiles.ownerId)).where(where),
    db.select({ login: profiles.trashedByAdminLogin }).from(profiles).where(and(isNotNull(profiles.trashedAt), isNotNull(profiles.trashedByAdminLogin))).groupBy(profiles.trashedByAdminLogin),
  ]);
  const total = Number(totalRow?.total ?? 0);
  const page = Math.min(readAdminPage(params.page), Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const linkParams = new URLSearchParams();
  if (q) linkParams.set("q", q);
  if (type) linkParams.set("tipo", type);
  if (origin) linkParams.set("origen", origin);
  if (author) linkParams.set("autor", author);
  const currentHref = pageHref("/admin/anuncios-publicaciones/papelera", linkParams, page);
  const rows = await db.select({
    id: profiles.id, displayName: profiles.displayName, type: profiles.type, status: profiles.status,
    city: profiles.city, trashedAt: profiles.trashedAt, trashedByKind: profiles.trashedByKind,
    trashedByActorId: profiles.trashedByActorId, trashedByAdminLogin: profiles.trashedByAdminLogin,
    ownerId: profiles.ownerId, ownerEmail: users.email,
  }).from(profiles).innerJoin(users, eq(users.id, profiles.ownerId)).where(where)
    .orderBy(desc(profiles.trashedAt), desc(profiles.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  const ids = rows.map((row) => row.id);
  const auditRows = ids.length ? await db.select({ id: adminAuditLogs.id, entityId: adminAuditLogs.entityId, action: adminAuditLogs.action, actorGithubLogin: adminAuditLogs.actorGithubLogin, createdAt: adminAuditLogs.createdAt })
    .from(adminAuditLogs).where(and(inArray(adminAuditLogs.entityId, ids), inArray(adminAuditLogs.action, ["profile.trash", "profile.trash_self", "profile.restore"])))
    .orderBy(desc(adminAuditLogs.createdAt)).limit(PAGE_SIZE * 15) : [];
  const mediaRows = ids.length ? await db.select({ profileId: profileMedia.profileId, total: count() }).from(profileMedia).where(inArray(profileMedia.profileId, ids)).groupBy(profileMedia.profileId) : [];
  const mediaCounts = new Map(mediaRows.map((row) => [row.profileId, Number(row.total)]));
  const history = new Map<string, typeof auditRows>();
  for (const entry of auditRows) {
    if (!entry.entityId) continue;
    const events = history.get(entry.entityId) ?? [];
    if (events.length < 5) events.push(entry);
    history.set(entry.entityId, events);
  }
  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="ANUNCIOS Y PUBLICACIONES" title="Papelera de anuncios" description="Anuncios retirados por la persona propietaria o por administración. Solo aquí pueden restaurarse o borrarse definitivamente." backHref="/admin/anuncios-publicaciones" />
    {params.notice && notices[params.notice] && <p className="admin-success" role="status">{notices[params.notice]}</p>}
    <p className="admin-profile-rule-note">Salvo una excepción expresamente autorizada, restaurar un Escort solo es posible si la cuenta no tiene otro Escort activo. Agencia y Arriendo pueden existir varias veces en la misma cuenta.</p>
    <form className="admin-profile-filters" method="get" role="search">
      <label className="admin-filter-search">Buscar anuncio, correo, usuario o ID<input name="q" type="search" defaultValue={q} placeholder="Nombre, @usuario o correo" /></label>
      <label>Tipo<select name="tipo" defaultValue={type}><option value="">Todos</option><option value="escort">Escort</option><option value="agency">Agencia</option><option value="rental">Arriendo</option></select></label>
      <label>Enviado por<select name="origen" defaultValue={origin}><option value="">Todos</option><option value="self">La persona usuaria</option><option value="admin">Administración</option></select></label>
      <label>Administrador<select name="autor" defaultValue={author}><option value="">Todos</option>{authorRows.filter((item) => item.login).map((item) => <option value={item.login!} key={item.login!}>@{item.login}</option>)}</select></label>
      <div className="admin-filter-actions"><button className="button button-primary" type="submit">Aplicar filtros</button><Link className="button button-outline" href="/admin/anuncios-publicaciones/papelera">Limpiar</Link></div>
    </form>
    <p className="admin-filter-summary">{total} anuncio{total === 1 ? "" : "s"} en la papelera{total > PAGE_SIZE ? ` · Página ${page}` : ""}.</p>
    {rows.length ? <section className="profile-trash-list" aria-label="Anuncios en papelera">{rows.map((profile) => <article className="profile-trash-card" key={profile.id}>
      <div className="profile-trash-card-main"><span className="profile-trash-badge">🗑 En papelera</span><h2>{profile.displayName}</h2><p>{profileTypeLabels[profile.type]} · {profile.city} · Antes: {profile.status}</p><p>Cuenta: <Link href={`/admin/cuentas/${encodeURIComponent(profile.ownerId)}`}>{profile.ownerEmail}</Link></p><p>Enviado {profile.trashedAt ? chileDate(profile.trashedAt) : "—"} por {profile.trashedByKind === "self" ? "la persona propietaria" : profile.trashedByAdminLogin ? `@${profile.trashedByAdminLogin} (administración)` : "administración"}.</p><p>Archivos conservados: {mediaCounts.get(profile.id) ?? 0} foto{mediaCounts.get(profile.id) === 1 ? " o video" : "s o videos"}. El contenido exclusivo permanece en la cuenta.</p></div>
      <details className="profile-trash-history"><summary>Ver historial de movimientos</summary>{(history.get(profile.id) ?? []).length ? <ol>{history.get(profile.id)!.map((event) => <li key={event.id}>{event.action === "profile.restore" ? "♻ Restauró" : "🗑 Envió a papelera"} · {event.actorGithubLogin ? `@${event.actorGithubLogin}` : "Persona propietaria"} · {chileDate(event.createdAt)}</li>)}</ol> : <p>Movimiento anterior sin registro individual; consulta la bitácora general.</p>}<Link href={`/admin/actividad?entity=profile&q=${encodeURIComponent(profile.displayName)}`}>Abrir bitácora completa</Link></details>
      <div className="profile-trash-actions">
        <Link className="button button-outline" href={`/admin/medios?perfil=${encodeURIComponent(profile.id)}&return_to=${encodeURIComponent(currentHref)}`}>Ver fotos y videos asociados</Link>
        <details><summary>♻ Restaurar anuncio</summary><form action={`/api/admin/profiles/${profile.id}/papelera`} method="post"><input type="hidden" name="action" value="restore" /><input type="hidden" name="return_to" value={currentHref} /><p>Volverá a su estado anterior. Si estaba publicado y la cuenta sigue activa, será visible de nuevo.</p><label>Escribe RESTAURAR<input name="confirmation" required autoComplete="off" /></label><button className="button button-primary" type="submit">Confirmar restauración</button></form></details>
        <details className="is-destructive"><summary>Eliminar definitivamente</summary><form action={`/api/admin/profiles/${profile.id}/papelera`} method="post"><input type="hidden" name="action" value="delete" /><input type="hidden" name="return_to" value={currentHref} /><p>Esto borra el anuncio, sus fotos, historias, documentos, reportes y relaciones. No se puede deshacer. La biblioteca de contenido exclusivo de la cuenta se conserva.</p><label>Escribe ELIMINAR DEFINITIVAMENTE<input name="confirmation" required autoComplete="off" /></label><button className="button button-danger" type="submit">Eliminar anuncio para siempre</button></form></details>
      </div>
    </article>)}</section> : <section className="admin-empty"><h2>No hay anuncios que coincidan</h2><p>Prueba otros filtros o vuelve a la lista de anuncios activos.</p></section>}
    <AdminPagination pathname="/admin/anuncios-publicaciones/papelera" params={linkParams} currentPage={page} totalItems={total} pageSize={PAGE_SIZE} label="Papelera" />
  </div></AdminShell>;
}
