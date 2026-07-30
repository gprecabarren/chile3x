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

export default async function AdminProfilesPage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/api/auth/github/start?return_to=/admin/perfiles");
  }

  const db = await getDb();
  const rows = await db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      type: profiles.type,
      status: profiles.status,
      city: profiles.city,
      region: profiles.region,
      ownerEmail: users.email,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .innerJoin(users, eq(profiles.ownerId, users.id))
    .orderBy(desc(profiles.updatedAt));

  return (
    <AdminShell user={admin}>
      <div className="admin-content">
        <AdminPageHeading
          eyebrow="MODERACIÓN GLOBAL"
          title="Perfiles y publicaciones"
          description="Como dueño puedes cambiar el estado de cualquier ficha. La publicación siempre requiere una revisión manual."
        />
        {rows.length === 0 ? (
          <section className="admin-empty">
            <h2>Aún no hay perfiles reales</h2>
            <p>Cuando se habilite el alta de anunciantes, sus avisos aparecerán aquí primero como borrador o pendientes de revisión.</p>
          </section>
        ) : (
          <section className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Perfil</th><th>Ubicación</th><th>Dueño</th><th>Estado</th><th>Actualizar</th></tr>
              </thead>
              <tbody>
                {rows.map((profile) => (
                  <tr key={profile.id}>
                    <td><strong>{profile.displayName}</strong><small>{profile.type}</small></td>
                    <td>{profile.city}, {profile.region}</td>
                    <td>{profile.ownerEmail}</td>
                    <td><span className={`admin-status admin-status-${profile.status}`}>{statusLabel[profile.status]}</span></td>
                    <td>
                      <form action={`/api/admin/profiles/${profile.id}/status`} method="post" className="admin-inline-form">
                        <select name="status" defaultValue={profile.status} aria-label={`Estado de ${profile.displayName}`}>
                          {Object.entries(statusLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
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
