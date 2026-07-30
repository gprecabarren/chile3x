import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";

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
  reviewed: "Comprobado",
};

export default async function AdminProfilesPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/api/auth/github/start?return_to=/admin/perfiles");
  }

  const db = await getDb();
  const rows = await db.select({
    id: profiles.id,
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

  return (
    <AdminShell user={admin}>
      <div className="admin-content">
        <AdminPageHeading
          eyebrow="MODERACIÓN GLOBAL"
          title="Perfiles y publicaciones"
          description="Revisa cada aviso antes de publicarlo. La verificación se realiza fuera del sitio; aquí solo registras el resultado, sin almacenar documentos sensibles."
        />
        {rows.length === 0 ? (
          <section className="admin-empty">
            <h2>Aún no hay perfiles reales</h2>
            <p>Los avisos creados por anunciantes llegarán aquí como borradores o pendientes de revisión.</p>
          </section>
        ) : (
          <section className="admin-table-wrap">
            <table className="admin-table admin-profile-table">
              <thead>
                <tr><th>Perfil</th><th>Ubicación</th><th>Dueño</th><th>Publicación</th><th>Verificación</th><th>Actualizar</th></tr>
              </thead>
              <tbody>
                {rows.map((profile) => (
                  <tr key={profile.id}>
                    <td><strong>{profile.displayName}</strong><small>{profile.type}</small></td>
                    <td>{profile.city}, {profile.region}</td>
                    <td>{profile.ownerEmail}</td>
                    <td><span className={`admin-status admin-status-${profile.status}`}>{statusLabel[profile.status]}</span></td>
                    <td><span className="admin-verification">{verificationLabel[profile.verificationStatus]}<small>{profile.healthReviewStatus === "reviewed" ? "Revisión médica opcional" : ""}</small></span></td>
                    <td>
                      <form action={`/api/admin/profiles/${profile.id}/status`} method="post" className="admin-inline-form admin-moderation-form">
                        <select name="status" defaultValue={profile.status} aria-label={`Estado de ${profile.displayName}`}>
                          {Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                        </select>
                        <select name="verification_status" defaultValue={profile.verificationStatus} aria-label={`Verificación de ${profile.displayName}`}>
                          {Object.entries(verificationLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                        </select>
                        <select name="health_review_status" defaultValue={profile.healthReviewStatus} aria-label={`Revisión médica de ${profile.displayName}`}>
                          <option value="not_requested">Sin solicitud médica</option>
                          <option value="in_review">Médico en revisión</option>
                          <option value="reviewed">Médico revisado</option>
                        </select>
                        <button type="submit">Guardar</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </AdminShell>
  );
}
