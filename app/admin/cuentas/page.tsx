import { count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountIdentityFields } from "@/app/account-identity-fields";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";
import { AdminPasswordField } from "./AdminPasswordField";
import { adminCallHref, adminWhatsappHref } from "@/lib/admin-contact";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  created: "La cuenta fue creada. Comparte la contraseña inicial por un canal seguro.",
  duplicate: "Ese correo ya tiene una cuenta registrada.",
  duplicate_rut: "Ya existe una cuenta registrada con ese RUT.",
  invalid: "Revisa los datos solicitados, incluidos documento, ciudad, fecha de nacimiento y confirmación de mayoría de edad.",
  status_updated: "El estado de la cuenta fue actualizado.",
  status_error: "No fue posible modificar esa cuenta.",
  account_missing: "La cuenta ya no existe.",
};

function roleLabel(role: string) {
  return role === "admin" ? "Administrador" : role === "advertiser" ? "Anunciante" : role === "tester" ? "Tester" : "Visitante";
}

function accountProfilesHref(email: string, returnTo = "/admin/cuentas", status?: string) {
  const params = new URLSearchParams({ q: email, return_to: returnTo });
  if (status) params.set("estado", status);
  return `/admin/perfiles?${params.toString()}`;
}

export default async function AdminAccountsPage({ searchParams }: { searchParams: Promise<{ notice?: string; q?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/cuentas");

  const [db, params] = await Promise.all([getDb(), searchParams]);
  const rows = await db.select({
    id: users.id,
    displayName: users.displayName,
    email: users.email,
    role: users.role,
    isActive: users.isActive,
    firstName: users.firstName,
    city: users.city,
    phone: users.phone,
    createdAt: users.createdAt,
    profileCount: count(profiles.id),
    pendingProfileCount: sql<number>`coalesce(sum(case when ${profiles.status} = 'pending' then 1 else 0 end), 0)`,
  }).from(users)
    .leftJoin(profiles, eq(profiles.ownerId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));
  const q = (params.q ?? "").trim().toLocaleLowerCase("es-CL");
  const filteredRows = q ? rows.filter((user) => [user.displayName, user.firstName, user.email, user.city].some((value) => value?.toLocaleLowerCase("es-CL").includes(q))) : rows;

  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="CUENTAS DEL PORTAL" title="Cuentas y accesos" description="Busca, revisa y administra las cuentas del portal. Desde cada ficha puedes abrir sus datos, sus anuncios y los accesos de recuperación." backHref="/admin" />
    {params.notice && notices[params.notice] && <p className="admin-success" role="status">{notices[params.notice]}</p>}
    <details className="admin-account-create"><summary><span>Crear cuenta</span><small>Los accesos de tester sólo pueden ser creados desde este panel.</small></summary><div><form action="/api/admin/users" method="post" className="admin-settings-form">
      <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} autoComplete="nickname" /></label>
      <label>Tipo de cuenta<select name="role" defaultValue="advertiser"><option value="advertiser">Anunciante</option><option value="tester">Tester de calidad</option></select><small>El tester conserva las funciones normales y obtiene el botón privado para reportar errores.</small></label>
      <AccountIdentityFields />
      <label>Correo electrónico<input name="email" required type="email" maxLength={160} autoComplete="email" /></label>
      <label className="admin-account-check"><input name="adult_verified" type="checkbox" value="yes" required />Confirmo que la persona fue verificada como mayor de 18 años fuera del sitio.</label>
      <AdminPasswordField label="Contraseña inicial" submitLabel="Crear cuenta" />
    </form></div></details>
    <section className="admin-account-list"><div><p className="eyebrow">REGISTRO DE USUARIOS</p><h2>{filteredRows.length} de {rows.length} cuenta{rows.length === 1 ? "" : "s"}</h2></div>
      <form className="admin-account-filters" method="get" role="search"><label htmlFor="account-search">Buscar por correo, nombre o ciudad<input id="account-search" name="q" type="search" defaultValue={params.q ?? ""} placeholder="Ej. nombre@correo.cl o Concepción" /></label><button className="button button-primary" type="submit">Buscar</button>{q && <Link className="button button-outline" href="/admin/cuentas">Limpiar</Link>}</form>
      <section className="admin-account-cards" aria-label="Cuentas registradas">{filteredRows.map((user) => {
        const detailsHref = `/admin/cuentas/${encodeURIComponent(user.id)}`;
        const formattedDate = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(`${user.createdAt}Z`.replace("ZZ", "Z")));
        const pendingProfileCount = Number(user.pendingProfileCount ?? 0);
        const whatsappHref = adminWhatsappHref(user.phone, user.displayName ?? "");
        const callHref = adminCallHref(user.phone);
        return <article className="admin-account-card" key={user.id}>
          <header><div><p className="eyebrow">{roleLabel(user.role)}</p><h3>{user.displayName ?? "Sin nombre"}</h3><a href={`mailto:${user.email}`}>{user.email}</a></div><span className={`account-status ${user.isActive ? "account-status-approved" : "account-status-rejected"}`}>{user.isActive ? "Activa" : "Deshabilitada"}</span></header>
          <dl><div><dt>Ciudad</dt><dd>{user.city || "Sin ciudad"}</dd></div><div><dt>Creación</dt><dd>{formattedDate}</dd></div><div><dt>Anuncios asociados</dt><dd>{user.profileCount > 0 ? <Link className="admin-profile-count-link" href={accountProfilesHref(user.email, detailsHref)}>Ver {user.profileCount} perfil{user.profileCount === 1 ? "" : "es"}</Link> : "Sin perfiles"}</dd></div></dl>
          {pendingProfileCount > 0 && <Link className="admin-account-pending-link" href={accountProfilesHref(user.email, detailsHref, "pending")}>{pendingProfileCount} anuncio{pendingProfileCount === 1 ? "" : "s"} pendiente{pendingProfileCount === 1 ? "" : "s"} de revisión</Link>}
          <div className="admin-account-card-actions"><Link className="button button-primary" href={detailsHref}>Ver detalles</Link>{user.role !== "admin" && user.isActive && <Link className="button button-outline" href={`${detailsHref}/crear-perfil`}>Crear perfil</Link>}{whatsappHref && <a className="button contact-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a>}{callHref && <a className="button contact-call" href={callHref}>Llamar</a>}{user.role !== "admin" && <form action={`/api/admin/users/${user.id}/estado`} method="post"><input name="next_state" type="hidden" value={user.isActive ? "disabled" : "active"} /><input name="return_to" type="hidden" value={params.q ? `/admin/cuentas?q=${encodeURIComponent(params.q)}` : "/admin/cuentas"} /><button className="button button-outline" type="submit">{user.isActive ? "Deshabilitar" : "Reactivar"}</button></form>}</div>
        </article>;
      })}{filteredRows.length === 0 && <section className="admin-no-results">No hay cuentas que coincidan con esta búsqueda.</section>}</section>
    </section>
  </div></AdminShell>;
}
