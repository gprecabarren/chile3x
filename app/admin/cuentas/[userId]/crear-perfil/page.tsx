import { chileanDay } from "@/lib/chile-day";
import Link from "@/app/NavigationLink";
import { and, asc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/app/mi-cuenta/ProfileForm";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { AdminPageHeading, AdminShell } from "@/app/admin/_components";
import { hasUnlimitedEscortListings } from "@/lib/profile-limits";

export const dynamic = "force-dynamic";

export default async function AdminCreateProfilePage({ params, searchParams }: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ error?: string; message?: string; agencia?: string }>;
}) {
  const admin = await getCurrentAdmin();
  const [{ userId }, query, db] = await Promise.all([params, searchParams, getDb()]);
  if (!admin) redirect(`/api/auth/github/start?return_to=/admin/cuentas/${encodeURIComponent(userId)}/crear-perfil`);
  if (!adminHasCapability(admin, "accounts.manage")) redirect("/admin/acceso-denegado?reason=permission");

  const canCreateCustody = adminHasCapability(admin, "profiles.moderate");
  const [[owner], [escort], agencies] = await Promise.all([
    db.select({ id: users.id, email: users.email, displayName: users.displayName, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1),
    db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.ownerId, userId), eq(profiles.type, "escort"), isNull(profiles.agencyCustodianId), isNull(profiles.trashedAt))).limit(1),
    canCreateCustody
      ? db.select({ id: profiles.id, displayName: profiles.displayName }).from(profiles)
        .innerJoin(users, and(eq(users.id, profiles.ownerId), eq(users.isActive, true)))
        .where(and(eq(profiles.ownerId, userId), eq(profiles.type, "agency"), isNull(profiles.trashedAt)))
        .orderBy(asc(profiles.displayName))
      : Promise.resolve([]),
  ]);
  if (!owner || owner.role === "admin") redirect("/admin/cuentas?notice=account_missing");
  const unlimitedEscort = hasUnlimitedEscortListings(owner);
  const defaultAgencyId = agencies.find(agency => agency.id === query.agencia)?.id;

  const detailHref = `/admin/cuentas/${encodeURIComponent(owner.id)}`;
  return <AdminShell user={admin}><div className="admin-content admin-create-profile-content">
    <AdminPageHeading eyebrow="CREACIÓN ASISTIDA" title="Crear anuncio para una cuenta" description={`El aviso quedará asociado a ${owner.displayName ?? owner.email} (${owner.email}). ${unlimitedEscort ? "Esta cuenta tiene autorización para crear Escorts personales sin límite de cantidad" : "Puede tener un Escort personal"} y varios anuncios de Agencia o Arriendo. Sus agencias también pueden gestionar varios perfiles de Escort.`} backHref={detailHref} />
    {!owner.isActive && <p className="form-alert" role="alert">Esta cuenta está deshabilitada. Reactívala antes de crear una publicación.</p>}
    {query.error && <p className="form-alert" role="alert">{query.message ?? "Revisa la información del formulario antes de crear el aviso."}</p>}
    {owner.isActive && <ProfileForm travelToday={chileanDay()} action={`/api/admin/cuentas/${encodeURIComponent(owner.id)}/perfiles`} submitLabel="Guardar y enviar a revisión" allowEscort={unlimitedEscort || !escort} agencies={agencies} defaultAgencyId={defaultAgencyId} adminAssisted />}
    <p className="admin-create-profile-note">Al guardar, cargarás los medios y luego podrás publicar el anuncio desde moderación. La cuenta propietaria podrá seguir gestionándolo desde su panel.</p>
    <Link prefetch={false} className="button button-outline" href={detailHref}>Volver a los datos de la cuenta</Link>
  </div></AdminShell>;
}
