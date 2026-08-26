import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/app/mi-cuenta/ProfileForm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "@/app/admin/_components";

export const dynamic = "force-dynamic";

export default async function AdminCreateProfilePage({ params, searchParams }: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const admin = await getCurrentAdmin();
  const [{ userId }, query, db] = await Promise.all([params, searchParams, getDb()]);
  if (!admin) redirect(`/api/auth/github/start?return_to=/admin/cuentas/${encodeURIComponent(userId)}/crear-perfil`);

  const [owner] = await db.select({ id: users.id, email: users.email, displayName: users.displayName, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!owner || owner.role === "admin") redirect("/admin/cuentas?notice=account_missing");

  const detailHref = `/admin/cuentas/${encodeURIComponent(owner.id)}`;
  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="CREACIÓN ASISTIDA" title="Crear anuncio para una cuenta" description={`El aviso quedará asociado a ${owner.displayName ?? owner.email} (${owner.email}). Puedes crear un Escort, Agencia o Arriendo y enviarlo a revisión.`} backHref={detailHref} />
    {!owner.isActive && <p className="form-alert" role="alert">Esta cuenta está deshabilitada. Reactívala antes de crear una publicación.</p>}
    {query.error && <p className="form-alert" role="alert">{query.message ?? "Revisa la información del formulario antes de crear el aviso."}</p>}
    {owner.isActive && <ProfileForm action={`/api/admin/cuentas/${encodeURIComponent(owner.id)}/perfiles`} submitLabel="Crear y enviar a revisión" />}
    <p className="admin-create-profile-note">Al guardar, podrás abrir el aviso desde moderación para revisar sus datos, documentos y material antes de aprobarlo.</p>
    <Link className="button button-outline" href={detailHref}>Volver a los datos de la cuenta</Link>
  </div></AdminShell>;
}
