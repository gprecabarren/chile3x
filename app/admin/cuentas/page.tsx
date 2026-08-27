import { count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountIdentityFields } from "@/app/account-identity-fields";
import { regions } from "@/app/locations";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";
import { AdminPasswordField } from "./AdminPasswordField";
import { adminCallHref, adminWhatsappHref } from "@/lib/admin-contact";

export const dynamic = "force-dynamic";

type AccountSearchParams = {
  notice?: string;
  q?: string;
  role?: string;
  account_status?: string;
  city?: string;
  phone?: string;
  email_status?: string;
  document?: string;
  listings?: string;
  listing_status?: string;
  listing_type?: string;
  created_from?: string;
  created_to?: string;
};

const notices: Record<string, string> = {
  created: "La cuenta fue creada. Comparte la contraseña inicial por un canal seguro.",
  duplicate: "Ese correo ya tiene una cuenta registrada.",
  duplicate_rut: "Ya existe una cuenta registrada con ese RUT.",
  invalid: "Revisa los datos solicitados, incluidos documento, ciudad, fecha de nacimiento y confirmación de mayoría de edad.",
  status_updated: "El estado de la cuenta fue actualizado.",
  status_error: "No fue posible modificar esa cuenta.",
  account_missing: "La cuenta ya no existe.",
};

const roleValues = ["admin", "advertiser", "tester", "visitor"] as const;
const accountStatusValues = ["active", "disabled"] as const;
const phoneValues = ["with_phone", "without_phone"] as const;
const emailStatusValues = ["verified", "unverified"] as const;
const documentValues = ["rut", "foreign", "none"] as const;
const listingValues = ["with_listings", "without_listings", "pending"] as const;
const listingStatusValues = ["draft", "pending", "approved", "paused", "rejected", "expired"] as const;
const listingTypeValues = ["escort", "agency", "rental"] as const;
const cityOptions = regions.flatMap((region) => region.cities).sort((a, b) => a.localeCompare(b, "es-CL"));

function roleLabel(role: string) {
  return role === "admin" ? "Administrador" : role === "advertiser" ? "Anunciante" : role === "tester" ? "Tester" : "Visitante";
}

function accountProfilesHref(email: string, returnTo = "/admin/cuentas", status?: string) {
  const params = new URLSearchParams({ q: email, return_to: returnTo });
  if (status) params.set("estado", status);
  return `/admin/perfiles?${params.toString()}`;
}

function readOption<T extends string>(value: string | undefined, allowed: readonly T[]) {
  return allowed.includes(value as T) ? value as T : "";
}

function readDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function matchesText(value: string | null | undefined, query: string) {
  return value?.toLocaleLowerCase("es-CL").includes(query) ?? false;
}

function listingStatusMatches(user: {
  draftProfileCount: number;
  pendingProfileCount: number;
  approvedProfileCount: number;
  pausedProfileCount: number;
  rejectedProfileCount: number;
  expiredProfileCount: number;
}, status: string) {
  return status === "draft" ? Number(user.draftProfileCount) > 0
    : status === "pending" ? Number(user.pendingProfileCount) > 0
      : status === "approved" ? Number(user.approvedProfileCount) > 0
        : status === "paused" ? Number(user.pausedProfileCount) > 0
          : status === "rejected" ? Number(user.rejectedProfileCount) > 0
            : status === "expired" ? Number(user.expiredProfileCount) > 0
              : true;
}

function listingTypeMatches(user: { escortProfileCount: number; agencyProfileCount: number; rentalProfileCount: number }, type: string) {
  return type === "escort" ? Number(user.escortProfileCount) > 0
    : type === "agency" ? Number(user.agencyProfileCount) > 0
      : type === "rental" ? Number(user.rentalProfileCount) > 0
        : true;
}

export default async function AdminAccountsPage({ searchParams }: { searchParams: Promise<AccountSearchParams> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/cuentas");

  const [db, params] = await Promise.all([getDb(), searchParams]);
  const filters = {
    role: readOption(params.role, roleValues),
    accountStatus: readOption(params.account_status, accountStatusValues),
    city: cityOptions.includes(params.city ?? "") ? params.city ?? "" : "",
    phone: readOption(params.phone, phoneValues),
    emailStatus: readOption(params.email_status, emailStatusValues),
    document: readOption(params.document, documentValues),
    listings: readOption(params.listings, listingValues),
    listingStatus: readOption(params.listing_status, listingStatusValues),
    listingType: readOption(params.listing_type, listingTypeValues),
    createdFrom: readDate(params.created_from),
    createdTo: readDate(params.created_to),
  };
  const q = (params.q ?? "").trim().toLocaleLowerCase("es-CL");
  const advancedFilters = Object.values(filters).filter(Boolean);
  const hasActiveFilters = Boolean(q || advancedFilters.length);
  const currentQuery = new URLSearchParams();
  if (q) currentQuery.set("q", params.q?.trim() ?? "");
  if (filters.role) currentQuery.set("role", filters.role);
  if (filters.accountStatus) currentQuery.set("account_status", filters.accountStatus);
  if (filters.city) currentQuery.set("city", filters.city);
  if (filters.phone) currentQuery.set("phone", filters.phone);
  if (filters.emailStatus) currentQuery.set("email_status", filters.emailStatus);
  if (filters.document) currentQuery.set("document", filters.document);
  if (filters.listings) currentQuery.set("listings", filters.listings);
  if (filters.listingStatus) currentQuery.set("listing_status", filters.listingStatus);
  if (filters.listingType) currentQuery.set("listing_type", filters.listingType);
  if (filters.createdFrom) currentQuery.set("created_from", filters.createdFrom);
  if (filters.createdTo) currentQuery.set("created_to", filters.createdTo);
  const currentAccountsHref = `/admin/cuentas${currentQuery.size ? `?${currentQuery.toString()}` : ""}`;

  const rows = await db.select({
    id: users.id,
    displayName: users.displayName,
    email: users.email,
    role: users.role,
    isActive: users.isActive,
    firstName: users.firstName,
    city: users.city,
    phone: users.phone,
    documentType: users.documentType,
    documentNumber: users.documentNumber,
    foreignCountry: users.foreignCountry,
    emailVerifiedAt: users.emailVerifiedAt,
    createdAt: users.createdAt,
    profileCount: count(profiles.id),
    draftProfileCount: sql<number>`coalesce(sum(case when ${profiles.status} = 'draft' then 1 else 0 end), 0)`,
    pendingProfileCount: sql<number>`coalesce(sum(case when ${profiles.status} = 'pending' then 1 else 0 end), 0)`,
    approvedProfileCount: sql<number>`coalesce(sum(case when ${profiles.status} = 'approved' then 1 else 0 end), 0)`,
    pausedProfileCount: sql<number>`coalesce(sum(case when ${profiles.status} = 'paused' then 1 else 0 end), 0)`,
    rejectedProfileCount: sql<number>`coalesce(sum(case when ${profiles.status} = 'rejected' then 1 else 0 end), 0)`,
    expiredProfileCount: sql<number>`coalesce(sum(case when ${profiles.status} = 'expired' then 1 else 0 end), 0)`,
    escortProfileCount: sql<number>`coalesce(sum(case when ${profiles.type} = 'escort' then 1 else 0 end), 0)`,
    agencyProfileCount: sql<number>`coalesce(sum(case when ${profiles.type} = 'agency' then 1 else 0 end), 0)`,
    rentalProfileCount: sql<number>`coalesce(sum(case when ${profiles.type} = 'rental' then 1 else 0 end), 0)`,
  }).from(users)
    .leftJoin(profiles, eq(profiles.ownerId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));
  const filteredRows = rows.filter((user) => {
    const profileCount = Number(user.profileCount ?? 0);
    const createdOn = user.createdAt.slice(0, 10);
    const textMatches = !q || [user.displayName, user.firstName, user.email, user.city, user.phone, user.documentNumber, user.foreignCountry].some((value) => matchesText(value, q));
    const accountMatches = !filters.accountStatus || (filters.accountStatus === "active" ? user.isActive : !user.isActive);
    const phoneMatches = !filters.phone || (filters.phone === "with_phone" ? Boolean(user.phone?.trim()) : !user.phone?.trim());
    const emailMatches = !filters.emailStatus || (filters.emailStatus === "verified" ? Boolean(user.emailVerifiedAt) : !user.emailVerifiedAt);
    const documentMatches = !filters.document || (filters.document === "none" ? !user.documentNumber : filters.document === "rut" ? user.documentType === "rut" && Boolean(user.documentNumber) : user.documentType === "foreign" && Boolean(user.documentNumber));
    const listingMatches = !filters.listings || (filters.listings === "with_listings" ? profileCount > 0 : filters.listings === "without_listings" ? profileCount === 0 : Number(user.pendingProfileCount) > 0);
    const createdAfter = !filters.createdFrom || createdOn >= filters.createdFrom;
    const createdBefore = !filters.createdTo || createdOn <= filters.createdTo;
    return textMatches
      && (!filters.role || user.role === filters.role)
      && accountMatches
      && (!filters.city || user.city === filters.city)
      && phoneMatches
      && emailMatches
      && documentMatches
      && listingMatches
      && listingStatusMatches(user, filters.listingStatus)
      && listingTypeMatches(user, filters.listingType)
      && createdAfter
      && createdBefore;
  });

  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="CUENTAS DEL PORTAL" title="Cuentas y accesos" description="Busca, revisa y administra las cuentas del portal. Desde cada ficha puedes abrir sus datos, sus anuncios y los accesos de recuperación." backHref="/admin" />
    {params.notice && notices[params.notice] && <p className="admin-success" role="status">{notices[params.notice]}</p>}
    <details className="admin-account-create"><summary><span><b>Crear cuenta</b><small>Abre este formulario solo cuando necesites registrar un anunciante o tester.</small></span></summary><div><form action="/api/admin/users" method="post" className="admin-settings-form">
      <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} autoComplete="nickname" placeholder="Ej. Valentina" /></label>
      <label>Tipo de cuenta<select name="role" defaultValue="advertiser"><option value="advertiser">Anunciante</option><option value="tester">Tester de calidad</option></select><small>El tester conserva las funciones normales y obtiene el botón privado para reportar errores.</small></label>
      <AccountIdentityFields />
      <label>Correo electrónico<input name="email" required type="email" maxLength={160} autoComplete="email" placeholder="Ej. valentina@correo.cl" /></label>
      <label className="admin-account-check"><input name="adult_verified" type="checkbox" value="yes" required />Confirmo que la persona fue verificada como mayor de 18 años fuera del sitio.</label>
      <AdminPasswordField label="Contraseña inicial" submitLabel="Crear cuenta" />
    </form></div></details>
    <section className="admin-account-list"><div><p className="eyebrow">REGISTRO DE USUARIOS</p><h2>{filteredRows.length} de {rows.length} cuenta{rows.length === 1 ? "" : "s"}</h2></div>
      <form className="admin-account-filters" method="get" role="search">
        <label htmlFor="account-search">Buscar en los datos de la cuenta<input id="account-search" name="q" type="search" defaultValue={params.q ?? ""} placeholder="Ej. correo, nombre, teléfono, ciudad o documento" /></label>
        <div className="admin-account-filter-actions"><button className="button button-primary" type="submit">Buscar</button>{hasActiveFilters && <Link className="button button-outline" href="/admin/cuentas">Limpiar</Link>}</div>
        <details className="admin-account-advanced-filters" open={advancedFilters.length > 0}>
          <summary><span><b>Filtros avanzados</b><small>{advancedFilters.length ? `${advancedFilters.length} filtro${advancedFilters.length === 1 ? "" : "s"} avanzado${advancedFilters.length === 1 ? "" : "s"} activo${advancedFilters.length === 1 ? "" : "s"}` : "Combina estado, contacto, anuncios y fechas"}</small></span></summary>
          <div className="admin-account-advanced-filter-grid">
            <label>Estado de cuenta<select name="account_status" defaultValue={filters.accountStatus}><option value="">Todas</option><option value="active">Activas</option><option value="disabled">Deshabilitadas</option></select></label>
            <label>Tipo de cuenta<select name="role" defaultValue={filters.role}><option value="">Todos</option><option value="advertiser">Anunciantes</option><option value="tester">Testers</option><option value="admin">Administradores</option><option value="visitor">Visitantes</option></select></label>
            <label>Ciudad<select name="city" defaultValue={filters.city}><option value="">Todas las ciudades</option>{cityOptions.map((city) => <option value={city} key={city}>{city}</option>)}</select></label>
            <label>Teléfono<select name="phone" defaultValue={filters.phone}><option value="">Cualquiera</option><option value="with_phone">Con teléfono</option><option value="without_phone">Sin teléfono</option></select></label>
            <label>Correo electrónico<select name="email_status" defaultValue={filters.emailStatus}><option value="">Todos</option><option value="verified">Correo verificado</option><option value="unverified">Correo pendiente de verificar</option></select></label>
            <label>Documento<select name="document" defaultValue={filters.document}><option value="">Cualquiera</option><option value="rut">Con RUT chileno</option><option value="foreign">Con documento extranjero</option><option value="none">Sin documento informado</option></select></label>
            <label>Anuncios asociados<select name="listings" defaultValue={filters.listings}><option value="">Cualquiera</option><option value="with_listings">Con anuncios</option><option value="without_listings">Sin anuncios</option><option value="pending">Con anuncios pendientes</option></select></label>
            <label>Estado del anuncio<select name="listing_status" defaultValue={filters.listingStatus}><option value="">Cualquiera</option><option value="draft">Borrador</option><option value="pending">En revisión</option><option value="approved">Publicado</option><option value="paused">Pausado</option><option value="rejected">Requiere cambios</option><option value="expired">Vencido</option></select></label>
            <label>Tipo de anuncio<select name="listing_type" defaultValue={filters.listingType}><option value="">Cualquiera</option><option value="escort">Escort</option><option value="agency">Agencia</option><option value="rental">Arriendo</option></select></label>
            <label>Creada desde<input name="created_from" type="date" defaultValue={filters.createdFrom} /></label>
            <label>Creada hasta<input name="created_to" type="date" defaultValue={filters.createdTo} /></label>
          </div>
          <div className="admin-account-advanced-actions"><button className="button button-primary" type="submit">Aplicar filtros</button><Link className="button button-outline" href="/admin/cuentas">Restablecer</Link></div>
        </details>
      </form>
      <section className="admin-account-cards" aria-label="Cuentas registradas">{filteredRows.map((user) => {
        const detailsBaseHref = `/admin/cuentas/${encodeURIComponent(user.id)}`;
        const detailsHref = `${detailsBaseHref}?return_to=${encodeURIComponent(currentAccountsHref)}`;
        const formattedDate = new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(`${user.createdAt}Z`.replace("ZZ", "Z")));
        const pendingProfileCount = Number(user.pendingProfileCount ?? 0);
        const whatsappHref = adminWhatsappHref(user.phone, user.displayName ?? "");
        const callHref = adminCallHref(user.phone);
        return <article className="admin-account-card" key={user.id}>
          <header><div><p className="eyebrow">{roleLabel(user.role)}</p><h3>{user.displayName ?? "Sin nombre"}</h3><a href={`mailto:${user.email}`}>{user.email}</a></div><span className={`account-status ${user.isActive ? "account-status-approved" : "account-status-rejected"}`}>{user.isActive ? "Activa" : "Deshabilitada"}</span></header>
          <dl><div><dt>Ciudad</dt><dd>{user.city || "Sin ciudad"}</dd></div><div><dt>Creación</dt><dd>{formattedDate}</dd></div><div><dt>Anuncios asociados</dt><dd>{user.profileCount > 0 ? <Link className="admin-profile-count-link" href={accountProfilesHref(user.email, detailsHref)}>Ver {user.profileCount} anuncio{user.profileCount === 1 ? "" : "s"}</Link> : "Sin anuncios"}</dd></div></dl>
          {pendingProfileCount > 0 && <Link className="admin-account-pending-link" href={accountProfilesHref(user.email, detailsHref, "pending")}>{pendingProfileCount} anuncio{pendingProfileCount === 1 ? "" : "s"} pendiente{pendingProfileCount === 1 ? "" : "s"} de revisión</Link>}
          <div className="admin-account-card-actions"><Link className="button button-primary" href={detailsHref}>Ver detalles</Link>{user.role !== "admin" && user.isActive && <Link className="button button-outline" href={`${detailsBaseHref}/crear-perfil?return_to=${encodeURIComponent(currentAccountsHref)}`}>Crear anuncio</Link>}{whatsappHref && <a className="button contact-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a>}{callHref && <a className="button contact-call" href={callHref}>Llamar</a>}{user.role !== "admin" && <form action={`/api/admin/users/${user.id}/estado`} method="post"><input name="next_state" type="hidden" value={user.isActive ? "disabled" : "active"} /><input name="return_to" type="hidden" value={currentAccountsHref} /><button className="button button-outline" type="submit">{user.isActive ? "Deshabilitar" : "Reactivar"}</button></form>}</div>
        </article>;
      })}{filteredRows.length === 0 && <section className="admin-no-results">No hay cuentas que coincidan con esta combinación de filtros. Prueba quitando uno o más criterios.</section>}</section>
    </section>
  </div></AdminShell>;
}
