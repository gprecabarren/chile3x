import { count, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profileDetails, profileVerificationFiles, profiles, users } from "@/db/schema";
import { getCurrentAdmin, safeAdminReturnTo } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";
import { profilePublicPath } from "@/lib/profile";
import { adminCallHref, adminWhatsappHref } from "@/lib/admin-contact";
import { formatRegionName } from "@/app/locations";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  approved: "Publicado",
  draft: "Borrador",
  expired: "Vencido",
  paused: "Pausado",
  pending: "En revisión",
  rejected: "Rechazado",
};

const verificationLabel: Record<string, string> = {
  unreviewed: "Sin revisar",
  in_review: "En verificación",
  reviewed: "Verificado ✓",
};

const healthReviewLabel: Record<string, string> = {
  not_requested: "No solicitada",
  in_review: "En revisión",
  reviewed: "Revisada",
};

const profileTypeLabel: Record<string, string> = {
  escort: "Escort",
  agency: "Agencia",
  rental: "Arriendo",
};

type AdminProfilesSearchParams = {
  q?: string;
  estado?: string;
  verificacion?: string;
  salud?: string;
  tipo?: string;
  ciudad?: string;
  return_to?: string;
  notice?: string;
};

const notices: Record<string, string> = {
  profile_created: "El aviso fue creado para esta cuenta. Puedes revisarlo y cambiar sus estados desde esta lista.",
};

function readFilter(value: string | undefined, allowed: string[]) {
  return value && allowed.includes(value) ? value : "";
}

export default async function AdminProfilesPage({ searchParams }: { searchParams: Promise<AdminProfilesSearchParams> }) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/api/auth/github/start?return_to=/admin/perfiles");
  }

  const [params, db] = await Promise.all([searchParams, getDb()]);
  const rows = await db.select({
    id: profiles.id,
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
    contactWhatsapp: profiles.contactWhatsapp,
    contactPhone: profileDetails.contactPhone,
    updatedAt: profiles.updatedAt,
  }).from(profiles)
    .innerJoin(users, eq(profiles.ownerId, users.id))
    .leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id))
    .orderBy(desc(profiles.updatedAt));
  const [pending, verificationFiles] = await Promise.all([
    db.select({ total: count() }).from(profiles).where(eq(profiles.status, "pending")).then((result) => result[0]),
    rows.length
      ? db.select({ profileId: profileVerificationFiles.profileId, kind: profileVerificationFiles.kind }).from(profileVerificationFiles).where(inArray(profileVerificationFiles.profileId, rows.map((profile) => profile.id)))
      : Promise.resolve([]),
  ]);

  const q = (params.q ?? "").trim().slice(0, 100).toLocaleLowerCase("es-CL");
  const status = readFilter(params.estado, Object.keys(statusLabel));
  const verification = readFilter(params.verificacion, Object.keys(verificationLabel));
  const health = readFilter(params.salud, ["not_requested", "in_review", "reviewed"]);
  const type = readFilter(params.tipo, ["escort", "agency", "rental"]);
  const city = (params.ciudad ?? "").trim().slice(0, 80);
  const requestedReturnTo = params.return_to ?? "";
  const profileListReturnTo = requestedReturnTo.startsWith("/admin/cuentas/") ? safeAdminReturnTo(requestedReturnTo) : "/admin";
  const returnToParams = new URLSearchParams();
  for (const [key, value] of [["q", params.q], ["estado", status], ["verificacion", verification], ["salud", health], ["tipo", type], ["ciudad", city]] as const) {
    if (value) returnToParams.set(key, value);
  }
  if (requestedReturnTo.startsWith("/admin/cuentas/")) returnToParams.set("return_to", profileListReturnTo);
  const adminReturnTo = returnToParams.size ? `/admin/perfiles?${returnToParams.toString()}` : "/admin/perfiles";
  const cities = [...new Set(rows.map((row) => row.city))].sort((left, right) => left.localeCompare(right, "es-CL"));
  const filteredRows = rows.filter((profile) => {
    const searchable = [profile.displayName, profile.ownerEmail, profile.city, profile.region, profile.type].join(" ").toLocaleLowerCase("es-CL");
    return (!q || searchable.includes(q))
      && (!status || profile.status === status)
      && (!verification || profile.verificationStatus === verification)
      && (!health || profile.healthReviewStatus === health)
      && (!type || profile.type === type)
      && (!city || profile.city === city);
  });
  const pendingCount = Number(pending?.total ?? 0);
  const documentsByProfile = new Map<string, Array<"identity" | "medical">>();
  for (const document of verificationFiles) {
    const documents = documentsByProfile.get(document.profileId) ?? [];
    documents.push(document.kind as "identity" | "medical");
    documentsByProfile.set(document.profileId, documents);
  }

  return (
    <AdminShell user={admin}>
      <div className="admin-content">
        <AdminPageHeading
          eyebrow="MODERACIÓN GLOBAL"
          title="Perfiles y publicaciones"
          description="Encuentra, filtra y revisa los avisos antes de publicarlos. Los documentos opcionales de verificación se mantienen privados y se descargan desde esta tabla o la ficha administrativa."
          backHref={profileListReturnTo}
        />
        {params.notice && notices[params.notice] && <p className="admin-success" role="status">{notices[params.notice]}</p>}
        {pendingCount > 0 && <section className="admin-review-alert" role="status"><div><p>REVISIÓN PENDIENTE</p><h2>{pendingCount} {pendingCount === 1 ? "aviso requiere" : "avisos requieren"} tu aprobación</h2><span>Actualiza sus estados directamente en esta tabla o abre la ficha si necesitas revisar el perfil completo.</span></div><Link className="button button-primary" href="/admin/perfiles?estado=pending">Revisar ahora</Link></section>}
        <form className="admin-profile-filters" method="get" role="search">
          <label className="admin-filter-search">Buscar por perfil, correo, ciudad o tipo<input name="q" type="search" defaultValue={q} placeholder="Ej. tomas@correo.cl o Concepción" /></label>
          <label>Publicación<select name="estado" defaultValue={status}><option value="">Todos los estados</option>{Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>Verificación<select name="verificacion" defaultValue={verification}><option value="">Todas</option>{Object.entries(verificationLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>Revisión médica<select name="salud" defaultValue={health}><option value="">Todas</option><option value="not_requested">No solicitada</option><option value="in_review">En revisión</option><option value="reviewed">Revisada</option></select></label>
          <label>Tipo<select name="tipo" defaultValue={type}><option value="">Todos los tipos</option><option value="escort">Escort</option><option value="agency">Agencia</option><option value="rental">Arriendo</option></select></label>
          <label>Ciudad<select name="ciudad" defaultValue={city}><option value="">Todas las ciudades</option>{cities.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
          <div className="admin-filter-actions"><button className="button button-primary" type="submit">Aplicar filtros</button><Link className="button button-outline" href="/admin/perfiles">Limpiar</Link></div>
        </form>
        <p className="admin-filter-summary">Mostrando {filteredRows.length} de {rows.length} perfil{rows.length === 1 ? "" : "es"}.</p>
        {rows.length === 0 ? (
          <section className="admin-empty">
            <h2>Aún no hay perfiles reales</h2>
            <p>Los avisos creados por anunciantes llegarán aquí como borradores o pendientes de revisión.</p>
          </section>
        ) : (
          <section className="admin-profile-list" aria-label="Perfiles para moderar">
            {filteredRows.map((profile) => {
              const documents = documentsByProfile.get(profile.id) ?? [];
              const profilePreviewHref = `${profilePublicPath(profile)}?return_to=${encodeURIComponent(adminReturnTo)}`;
              const whatsappHref = adminWhatsappHref(profile.contactWhatsapp ?? profile.contactPhone, profile.displayName);
              const callHref = adminCallHref(profile.contactPhone ?? profile.contactWhatsapp);
              return <article className="admin-profile-card" key={profile.id}>
                <header>
                  <div>
                    <p className="eyebrow">{profileTypeLabel[profile.type] ?? profile.type}</p>
                    <h2>{profile.displayName}</h2>
                    <p>{profile.city}, {formatRegionName(profile.region)}</p>
                  </div>
                  <div className="admin-profile-card-links"><Link className="button button-public-preview" href={profilePreviewHref} target="_blank">Revisar perfil</Link><Link className="button button-outline" href={`/admin/medios?perfil=${encodeURIComponent(profile.id)}`}>Fotos y videos</Link>{whatsappHref && <a className="button contact-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">WhatsApp</a>}{callHref && <a className="button contact-call" href={callHref}>Llamar</a>}</div>
                </header>
                <dl className="admin-profile-card-owner"><div><dt>Dueño</dt><dd>{profile.ownerEmail}</dd></div><div><dt>Usuario del anuncio</dt><dd>{profile.handle ? `@${profile.handle}` : "Sin usuario público"}</dd></div></dl>
                <form className="admin-profile-card-review" action={`/api/admin/profiles/${profile.id}/status`} method="post">
                  <input type="hidden" name="return_to" value={adminReturnTo} />
                  <label>Publicación<select name="status" defaultValue={profile.status} aria-label={`Publicación de ${profile.displayName}`}>{Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                  <label>Verificación<select name="verification_status" defaultValue={profile.verificationStatus} aria-label={`Verificación de ${profile.displayName}`}>{Object.entries(verificationLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                  <label>Revisión médica<select name="health_review_status" defaultValue={profile.healthReviewStatus} aria-label={`Revisión médica de ${profile.displayName}`}>{Object.entries(healthReviewLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
                  <button className="button button-primary" type="submit">Guardar estados</button>
                </form>
                <div className="admin-profile-card-documents"><strong>Documentos privados</strong><div className="admin-profile-document-links">{documents.length > 0 ? documents.map((kind) => <a key={kind} href={`/api/perfiles/${profile.id}/documentos/${kind}`}>{kind === "identity" ? "Carnet" : "Examen médico"}</a>) : <small>Sin documentos privados adjuntos.</small>}</div></div>
              </article>;
            })}
            {filteredRows.length === 0 && <section className="admin-no-results">No hay perfiles que coincidan con estos filtros.</section>}
          </section>
        )}
      </div>
    </AdminShell>
  );
}
