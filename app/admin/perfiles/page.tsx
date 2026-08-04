import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";
import { profilePublicPath } from "@/lib/profile";

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

type AdminProfilesSearchParams = {
  q?: string;
  estado?: string;
  verificacion?: string;
  salud?: string;
  tipo?: string;
  ciudad?: string;
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
    updatedAt: profiles.updatedAt,
  }).from(profiles)
    .innerJoin(users, eq(profiles.ownerId, users.id))
    .orderBy(desc(profiles.updatedAt));
  const [pending] = await db.select({ total: count() }).from(profiles).where(eq(profiles.status, "pending"));

  const q = (params.q ?? "").trim().slice(0, 100).toLocaleLowerCase("es-CL");
  const status = readFilter(params.estado, Object.keys(statusLabel));
  const verification = readFilter(params.verificacion, Object.keys(verificationLabel));
  const health = readFilter(params.salud, ["not_requested", "in_review", "reviewed"]);
  const type = readFilter(params.tipo, ["escort", "agency", "rental"]);
  const city = (params.ciudad ?? "").trim().slice(0, 80);
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

  return (
    <AdminShell user={admin}>
      <div className="admin-content">
        <AdminPageHeading
          eyebrow="MODERACIÓN GLOBAL"
          title="Perfiles y publicaciones"
          description="Encuentra, filtra y revisa los avisos antes de publicarlos. Los documentos opcionales de verificación se mantienen privados y solo se descargan desde la ficha administrativa."
          backHref="/admin"
        />
        {pendingCount > 0 && <section className="admin-review-alert" role="status"><div><p>REVISIÓN PENDIENTE</p><h2>{pendingCount} {pendingCount === 1 ? "aviso requiere" : "avisos requieren"} tu aprobación</h2><span>Abre cada perfil para verlo como lo verá el público y decide su publicación desde esa ficha.</span></div><Link className="button button-primary" href="/admin/perfiles?estado=pending">Revisar ahora</Link></section>}
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
          <section className="admin-table-wrap">
            <table className="admin-table admin-profile-table">
              <thead>
                <tr><th>Perfil</th><th>Ubicación</th><th>Dueño</th><th>Publicación</th><th>Verificación</th><th>Revisar y actualizar</th></tr>
              </thead>
              <tbody>
                {filteredRows.map((profile) => (
                  <tr key={profile.id}>
                    <td><strong>{profile.displayName}</strong><small>{profile.type}</small></td>
                    <td>{profile.city}, {profile.region}</td>
                    <td>{profile.ownerEmail}</td>
                    <td><span className={`admin-status admin-status-${profile.status}`}>{statusLabel[profile.status]}</span></td>
                    <td><span className="admin-verification">{verificationLabel[profile.verificationStatus]}<small>{profile.healthReviewStatus === "reviewed" ? "Revisión médica opcional" : ""}</small></span></td>
                    <td><div className="admin-profile-row-actions"><Link className="button button-public-preview" href={profilePublicPath(profile)} target="_blank">{profile.status === "approved" ? "Ver público y gestionar" : "Abrir y revisar"}</Link><small>Aprueba publicación, verificación y revisión médica dentro de la ficha.</small></div></td>
                  </tr>
                ))}
                {filteredRows.length === 0 && <tr><td colSpan={6} className="admin-no-results">No hay perfiles que coincidan con estos filtros.</td></tr>}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
