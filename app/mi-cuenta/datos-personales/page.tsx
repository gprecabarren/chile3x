import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountIdentityFields } from "@/app/account-identity-fields";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "../_components";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function AccountDetailsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/datos-personales");
  const [record] = await (await getDb()).select({
    displayName: users.displayName,
    firstName: users.firstName,
    documentType: users.documentType,
    documentNumber: users.documentNumber,
    birthDate: users.birthDate,
    city: users.city,
    phone: users.phone,
    email: users.email,
  }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!record) redirect("/mi-cuenta");
  const { notice } = await searchParams;

  return <AccountShell user={user}><div className="account-content">
    <AccountHeading eyebrow="MI CUENTA" title="Tus datos" description="Actualiza tus datos de contacto y documento. El correo y la fecha de nacimiento se mantienen protegidos; solicita una corrección al soporte si fuera necesario." backHref="/mi-cuenta" />
    {notice === "saved" && <p className="account-success" role="status">Tus datos fueron actualizados.</p>}
    {notice === "error" && <p className="form-alert" role="alert">No se pudieron guardar los cambios. Revisa el documento y la ciudad.</p>}
    <form action="/api/mi-cuenta/datos" method="post" className="account-details-form">
      <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} defaultValue={record.displayName ?? ""} /></label>
      <AccountIdentityFields values={{ fullName: record.firstName, documentType: record.documentType, documentNumber: record.documentNumber, birthDate: record.birthDate, city: record.city, phone: record.phone }} birthDateReadOnly />
      <label>Correo electrónico<input value={record.email} readOnly aria-readonly="true" /><small>El correo no se puede modificar desde aquí.</small></label>
      <div className="account-details-actions"><Link className="button button-outline" href="/mi-cuenta">Cancelar</Link><button className="button button-primary" type="submit">Guardar datos</button></div>
    </form>
  </div></AccountShell>;
}
