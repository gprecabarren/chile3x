import { count, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  created: "La cuenta de anunciante fue creada. Comparte la contraseña inicial por un canal seguro.",
  duplicate: "Ese correo ya tiene una cuenta registrada.",
  invalid: "Revisa los datos: nombre, correo, contraseña de al menos 12 caracteres y confirmación de mayoría de edad.",
};

export default async function AdminAccountsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/cuentas");

  const [db, params] = await Promise.all([getDb(), searchParams]);
  const rows = await db.select({
    id: users.id,
    displayName: users.displayName,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt,
    profileCount: count(profiles.id),
  }).from(users)
    .leftJoin(profiles, eq(profiles.ownerId, users.id))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt));

  return <AdminShell user={admin}>
    <div className="admin-content">
      <AdminPageHeading eyebrow="CUENTAS DEL PORTAL" title="Crear cuenta de anunciante" description="Crea accesos para anunciantes verificados por tu proceso externo. La persona podrá entrar, crear perfiles y administrarlos desde su cuenta." />
      {params.notice && notices[params.notice] && <p className="admin-success" role="status">{notices[params.notice]}</p>}
      <section className="admin-account-create">
        <form action="/api/admin/users" method="post" className="admin-settings-form">
          <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} autoComplete="name" /></label>
          <label>Correo electrónico<input name="email" required type="email" maxLength={160} autoComplete="email" /></label>
          <label>Contraseña inicial<input name="password" required type="password" minLength={12} autoComplete="new-password" /><small>Compártela por un canal seguro. El acceso creado será de anunciante.</small></label>
          <label className="admin-account-check"><input name="adult_verified" type="checkbox" value="yes" required />Confirmo que la persona fue verificada como mayor de 18 años fuera del sitio.</label>
          <button className="button button-primary" type="submit">Crear cuenta</button>
        </form>
      </section>
      <section className="admin-account-list">
        <div><p className="eyebrow">REGISTRO DE USUARIOS</p><h2>{rows.length} cuenta{rows.length === 1 ? "" : "s"}</h2></div>
        <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Usuario</th><th>Rol</th><th>Perfiles</th><th>Creación</th></tr></thead><tbody>{rows.map((user) => <tr key={user.id}><td><strong>{user.displayName ?? "Sin nombre"}</strong><small>{user.email}</small></td><td>{user.role === "admin" ? "Administrador" : user.role === "advertiser" ? "Anunciante" : "Visitante"}</td><td>{user.profileCount}</td><td>{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(`${user.createdAt}Z`.replace("ZZ", "Z")))}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  </AdminShell>;
}
