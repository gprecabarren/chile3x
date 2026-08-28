import { and, count, desc, eq, inArray, or, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatRegionName } from "@/app/locations";
import { getDb } from "@/db";
import { exclusiveContentCollections, exclusiveContentMedia, profileDetails, profileMedia, profileVerificationFiles, profiles, users } from "@/db/schema";
import { adminCallHref, adminWhatsappHref } from "@/lib/admin-contact";
import { getCurrentAdmin, safeAdminReturnTo } from "@/lib/auth";
import { profilePublicPath } from "@/lib/profile";
import { AdminPageHeading, AdminShell } from "../_components";
import { AdminPagination, pageHref, readAdminPage } from "../pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const statusLabel: Record<string, string> = { approved: "Publicado", draft: "Borrador", expired: "Vencido", paused: "Pausado", pending: "En revisión", rejected: "Rechazado" };
const verificationLabel: Record<string, string> = { unreviewed: "Sin revisar", in_review: "En verificación", reviewed: "Verificado ✓" };
const healthReviewLabel: Record<string, string> = { not_requested: "No solicitada", in_review: "En revisión", reviewed: "Revisada" };
const profileTypeLabel: Record<string, string> = { escort: "Escort", agency: "Agencia", rental: "Arriendo" };

type AdminProfilesSearchParams = {
  q?: string;
  estado?: string;
  verificacion?: string;
  salud?: string;
  tipo?: string;
  ciudad?: string;
  page?: string;
  return_to?: string;
  notice?: string;
};

const notices: Record<string, string> = {
  profile_created: "El anuncio fue creado para esta cuenta. Puedes revisarlo y cambiar sus estados desde esta lista.",
};

function readFilter(value: string | undefined, allowed: string[]) {
  return value && allowed.includes(value) ? value : "";
}

function mediaHref(profileId: string, returnTo: string, options: { status?: string; type?: string } = {}) {
  const params = new URLSearchParams({ perfil: profileId, return_to: returnTo });
  if (options.status) params.set("estado", options.status);
  if (options.type) params.set("tipo", options.type);
  return "/admin/medios?" + params.toString();
}

export default async function AdminProfilesPage({ searchParams }: { searchParams: Promise<AdminProfilesSearchParams> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/perfiles");

  const [params, db] = await Promise.all([searchParams, getDb()]);
  const q = (params.q ?? "").trim().slice(0, 100).toLocaleLowerCase("es-CL");
  const status = readFilter(params.estado, Object.keys(statusLabel));
  const verification = readFilter(params.verificacion, Object.keys(verificationLabel));
  const health = readFilter(params.salud, ["not_requested", "in_review", "reviewed"]);
  const type = readFilter(params.tipo, ["escort", "agency", "rental"]);
  const city = (params.ciudad ?? "").trim().slice(0, 80);
  const requestedReturnTo = params.return_to ?? "";
  const profileListReturnTo = requestedReturnTo.startsWith("/admin/cuentas/") ? safeAdminReturnTo(requestedReturnTo) : "/admin";
  const requestedPage = readAdminPage(params.page);

  const linkParams = new URLSearchParams();
  for (const [key, value] of [["q", params.q?.trim()], ["estado", status], ["verificacion", verification], ["salud", health], ["tipo", type], ["ciudad", city]] as const) {
    if (value) linkParams.set(key, value);
  }
  if (requestedReturnTo.startsWith("/admin/cuentas/")) linkParams.set("return_to", profileListReturnTo);

  const filters = [];
  if (q) {
    const searchValue = "%" + q + "%";
    filters.push(or(
      sql`lower(${profiles.displayName}) like ${searchValue}`,
      sql`lower(${profiles.handle}) like ${searchValue}`,
      sql`lower(${users.email}) like ${searchValue}`,
      sql`lower(${profiles.city}) like ${searchValue}`,
      sql`lower(${profiles.region}) like ${searchValue}`,
      sql`lower(${profiles.type}) like ${searchValue}`,
      sql`lower(${profileDetails.contactPhone}) like ${searchValue}`,
    ));
  }
  if (status) filters.push(eq(profiles.status, status as typeof profiles.$inferSelect.status));
  if (verification) filters.push(eq(profiles.verificationStatus, verification as typeof profiles.$inferSelect.verificationStatus));
  if (health) filters.push(eq(profiles.healthReviewStatus, health as typeof profiles.$inferSelect.healthReviewStatus));
  if (type) filters.push(eq(profiles.type, type as typeof profiles.$inferSelect.type));
  if (city) filters.push(eq(profiles.city, city));
  const where = filters.length ? and(...filters) : undefined;

  const selectRows = () => db.select({
    id: profiles.id,
    ownerId: profiles.ownerId,
    slug: profiles.slug,
    handle: profiles.handle,
    displayName: profiles.displayName,
    type: profiles.type,
    status: profiles.status,
    city: profiles.city,
    region: profiles.region,
    verificationStatus: profiles.verificationStatus,
    healthReviewStatus: profiles.healthReviewStatus,
    ownerEmail: users.email,
    ownerUsername: users.username,
    contactWhatsapp: profiles.contactWhatsapp,
    contactPhone: profileDetails.contactPhone,
    updatedAt: profiles.updatedAt,
  }).from(profiles)
    .innerJoin(users, eq(profiles.ownerId, users.id))
    .leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id));

  const countQuery = where
    ? db.select({ total: count() }).from(profiles).innerJoin(users, eq(profiles.ownerId, users.id)).leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id)).where(where)
    : db.select({ total: count() }).from(profiles);
  const [countRows, pendingRows, cityRows] = await Promise.all([
    countQuery,
    db.select({ total: count() }).from(profiles).where(eq(profiles.status, "pending")),
    db.select({ city: profiles.city }).from(profiles).groupBy(profiles.city),
  ]);
  const total = Number(countRows[0]?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const adminReturnTo = pageHref("/admin/perfiles", linkParams, page);
  const pageRows = await (where ? selectRows().where(where) : selectRows())
    .orderBy(desc(profiles.updatedAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const pageIds = pageRows.map((profile) => profile.id);
  const [verificationFiles, publicMediaCounts, exclusiveMediaCounts] = await Promise.all([
    pageIds.length
      ? db.select({ profileId: profileVerificationFiles.profileId, kind: profileVerificationFiles.kind }).from(profileVerificationFiles).where(inArray(profileVerificationFiles.profileId, pageIds))
      : Promise.resolve([]),
    pageIds.length
      ? db.select({
        profileId: profileMedia.profileId,
        total: count(profileMedia.id),
        pending: sql<number>`coalesce(sum(case when ${profileMedia.moderationStatus} = 'pending' then 1 else 0 end), 0)`,
      }).from(profileMedia).where(inArray(profileMedia.profileId, pageIds)).groupBy(profileMedia.profileId)
      : Promise.resolve([]),
    pageIds.length
      ? db.select({
        profileId: exclusiveContentCollections.profileId,
        collectionId: exclusiveContentCollections.id,
        total: count(exclusiveContentMedia.id),
        pending: sql<number>`coalesce(sum(case when ${exclusiveContentMedia.moderationStatus} = 'pending' then 1 else 0 end), 0)`,
      }).from(exclusiveContentCollections)
        .leftJoin(exclusiveContentMedia, eq(exclusiveContentMedia.collectionId, exclusiveContentCollections.id))
        .where(inArray(exclusiveContentCollections.profileId, pageIds))
        .groupBy(exclusiveContentCollections.id)
      : Promise.resolve([]),
  ]);

  const documentsByProfile = new Map<string, Array<"identity" | "medical">>();
  for (const document of verificationFiles) {
    const documents = documentsByProfile.get(document.profileId) ?? [];
    documents.push(document.kind as "identity" | "medical");
    documentsByProfile.set(document.profileId, documents);
  }
  const publicMediaByProfile = new Map(publicMediaCounts.map((row) => [row.profileId, { total: Number(row.total ?? 0), pending: Number(row.pending ?? 0) }]));
  const exclusiveMediaByProfile = new Map(exclusiveMediaCounts
    .filter((row): row is typeof row & { profileId: string } => Boolean(row.profileId))
    .map((row) => [row.profileId, { collectionId: row.collectionId, total: Number(row.total ?? 0), pending: Number(row.pending ?? 0) }]));
  const pendingCount = Number(pendingRows[0]?.total ?? 0);
  const cities = cityRows.map((row) => row.city).sort((left, right) => left.localeCompare(right, "es-CL"));

  return <AdminShell user={admin}>
    <div className="admin-content">
      <AdminPageHeading eyebrow="MODERACIÓN GLOBAL" title="Anuncios y publicaciones" description="Encuentra, filtra y revisa los anuncios antes de publicarlos. Los documentos opcionales de verificación se mantienen privados y se descargan desde esta lista o la ficha administrativa." backHref={profileListReturnTo} />
      {params.notice && notices[params.notice] && <p className="admin-success" role="status">{notices[params.notice]}</p>}
      {pendingCount > 0 && <section className="admin-review-alert" role="status"><div><p>REVISIÓN PENDIENTE</p><h2>{pendingCount} {pendingCount === 1 ? "anuncio requiere" : "anuncios requieren"} tu aprobación</h2><span>Actualiza sus estados directamente en esta lista o abre la ficha si necesitas revisar el anuncio completo.</span></div><Link className="button button-primary" href="/admin/perfiles?estado=pending">Revisar ahora</Link></section>}
      <form className="admin-profile-filters" method="get" role="search">
        {requestedReturnTo.startsWith("/admin/cuentas/") && <input type="hidden" name="return_to" value={profileListReturnTo} />}
        <label className="admin-filter-search">Buscar por anuncio, correo, usuario, teléfono, ciudad o tipo<input name="q" type="search" defaultValue={params.q ?? ""} placeholder="Ej. valentina@correo.cl, @valentina o Concepción" /></label>
        <label>Publicación<select name="estado" defaultValue={status}><option value="">Todos los estados</option>{Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Verificación<select name="verificacion" defaultValue={verification}><option value="">Todas</option>{Object.entries(verificationLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <label>Revisión médica<select name="salud" defaultValue={health}><option value="">Todas</option><option value="not_requested">No solicitada</option><option value="in_review">En revisión</option><option value="reviewed">Revisada</option></select></label>
        <label>Tipo<select name="tipo" defaultValue={type}><option value="">Todos los tipos</option><option value="escort">Escort</option><option value="agency">Agencia</option><option value="rental">Arriendo</option></select></label>
        <label>Ciudad<select name="ciudad" defaultValue={city}><option value="">Todas las ciudades</option>{cities.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <div className="admin-filter-actions"><button className="button button-primary" type="submit">Aplicar filtros</button><Link className="button button-outline" href="/admin/perfiles">Limpiar</Link></div>
      </form>
      <p className="admin-filter-summary">Mostrando {pageRows.length} de {total} anuncio{total === 1 ? "" : "s"}.{total > PAGE_SIZE ? " Página " + page + " de " + totalPages + "." : ""}</p>
      {total === 0 ? <section className="admin-empty"><h2>Aún no hay anuncios que coincidan</h2><p>Prueba ajustando los filtros o vuelve a la lista completa para revisar los anuncios creados por las cuentas.</p></section> : <>
        <section className="admin-profile-list" aria-label="Anuncios para moderar">
          {pageRows.map((profile) => {
            const documents = documentsByProfile.get(profile.id) ?? [];
            const publicMedia = publicMediaByProfile.get(profile.id) ?? { total: 0, pending: 0 };
            const exclusiveMedia = exclusiveMediaByProfile.get(profile.id);
            const profilePreviewHref = profilePublicPath(profile) + "?return_to=" + encodeURIComponent(adminReturnTo);
            const accountHref = "/admin/cuentas/" + encodeURIComponent(profile.ownerId) + "?return_to=" + encodeURIComponent(adminReturnTo);
            const whatsappHref = adminWhatsappHref(profile.contactWhatsapp ?? profile.contactPhone, profile.displayName);
            const callHref = adminCallHref(profile.contactPhone ?? profile.contactWhatsapp);
            return <article className="admin-profile-card" key={profile.id}>
              <header><div><p className="eyebrow">{profileTypeLabel[profile.type] ?? profile.type}</p><h2>{profile.displayName}</h2><p>{profile.city}, {formatRegionName(profile.region)}</p></div>
                <div className="admin-profile-card-links"><Link className="button button-public-preview" href={profilePreviewHref} target="_blank">Ver anuncio público</Link><Link className="button button-outline" href={mediaHref(profile.id, adminReturnTo)}>Fotos y videos{publicMedia.total > 0 ? " (" + publicMedia.total + ")" : ""}</Link>{exclusiveMedia && <Link className="button button-outline" href={mediaHref(profile.id, adminReturnTo, { type: "exclusive" })}>Contenido exclusivo{exclusiveMedia.total > 0 ? " (" + exclusiveMedia.total + ")" : ""}</Link>}{whatsappHref && <a className="button contact-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a>}{callHref && <a className="button contact-call" href={callHref}>Llamar</a>}</div>
              </header>
              <dl className="admin-profile-card-owner"><div><dt>Cuenta propietaria</dt><dd><a href={"mailto:" + profile.ownerEmail}>{profile.ownerEmail}</a></dd></div><div><dt>Usuario de la cuenta</dt><dd><Link href={accountHref}>{profile.ownerUsername ? "@" + profile.ownerUsername : "Ver detalles de la cuenta"}</Link></dd></div></dl>
              {(publicMedia.pending > 0 || (exclusiveMedia?.pending ?? 0) > 0) && <div className="admin-profile-pending-media" aria-label="Archivos pendientes de aprobación">
                {publicMedia.pending > 0 && <Link href={mediaHref(profile.id, adminReturnTo, { status: "pending" })}>{publicMedia.pending} archivo{publicMedia.pending === 1 ? "" : "s"} público{publicMedia.pending === 1 ? "" : "s"} pendiente{publicMedia.pending === 1 ? "" : "s"}</Link>}
                {(exclusiveMedia?.pending ?? 0) > 0 && <Link href={mediaHref(profile.id, adminReturnTo, { status: "pending", type: "exclusive" })}>{exclusiveMedia?.pending} archivo{exclusiveMedia?.pending === 1 ? "" : "s"} de contenido exclusivo pendiente{exclusiveMedia?.pending === 1 ? "" : "s"}</Link>}
              </div>}
              <form className="admin-profile-card-review" action={"/api/admin/profiles/" + profile.id + "/status"} method="post"><input type="hidden" name="return_to" value={adminReturnTo} /><label>Publicación<select name="status" defaultValue={profile.status} aria-label={"Publicación de " + profile.displayName}>{Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Verificación<select name="verification_status" defaultValue={profile.verificationStatus} aria-label={"Verificación de " + profile.displayName}>{Object.entries(verificationLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Revisión médica<select name="health_review_status" defaultValue={profile.healthReviewStatus} aria-label={"Revisión médica de " + profile.displayName}>{Object.entries(healthReviewLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><button className="button button-primary" type="submit">Guardar estados</button></form>
              <div className="admin-profile-card-documents"><strong>Documentos privados</strong><div className="admin-profile-document-links">{documents.length > 0 ? documents.map((kind) => <a key={kind} href={"/api/perfiles/" + profile.id + "/documentos/" + kind}>{kind === "identity" ? "Carnet" : "Examen médico"}</a>) : <small>Sin documentos privados adjuntos.</small>}</div></div>
            </article>;
          })}
        </section>
        <AdminPagination pathname="/admin/perfiles" params={linkParams} currentPage={page} totalItems={total} pageSize={PAGE_SIZE} label="Anuncios" />
      </>}
    </div>
  </AdminShell>;
}
