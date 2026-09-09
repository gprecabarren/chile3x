import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountIdentityFields } from "@/app/account-identity-fields";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "../_components";
import { eq } from "drizzle-orm";
import { PasswordChangeForm } from "./PasswordChangeForm";

export const dynamic = "force-dynamic";

export default async function AccountDetailsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/datos-personales");
  const [record] = await (await getDb()).select({
    displayName: users.displayName,
    firstName: users.firstName,
    documentType: users.documentType,
    documentNumber: users.documentNumber,
    foreignCountry: users.foreignCountry,
    birthDate: users.birthDate,
    city: users.city,
    phone: users.phone,
    email: users.email,
    username: users.username,
  }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!record) redirect("/mi-cuenta");
  const { notice } = await searchParams;

  return <AccountShell user={user}><div className="account-content">
    <AccountHeading eyebrow="MI CUENTA" title="Tus datos" description="Actualiza tus datos de contacto y documento. El correo y la fecha de nacimiento se mantienen protegidos; solicita una corrección al soporte si fuera necesario." backHref="/mi-cuenta" />
    {notice === "saved" && <p className="account-success" role="status">Tus datos fueron actualizados.</p>}
    {notice === "username_saved" && <p className="account-success" role="status">Tu nombre de usuario fue actualizado.</p>}
    {notice === "username_taken" && <p className="form-alert" role="alert">Ese nombre de usuario ya pertenece a una cuenta o a un anuncio. Elige otro.</p>}
    {notice === "username_invalid" && <p className="form-alert" role="alert">Revisa el nombre de usuario. Usa entre 3 y 48 caracteres: letras minúsculas, números o guiones.</p>}
    {notice === "error" && <p className="form-alert" role="alert">No se pudieron guardar los cambios. Revisa el documento y la ciudad.</p>}
    {notice === "password_saved" && <p className="account-success" role="status">Tu contraseña fue actualizada. Las demás sesiones de esta cuenta se cerraron.</p>}
    {notice === "password_error" && <p className="form-alert" role="alert">Revisa la nueva contraseña y su confirmación.</p>}
    {notice === "disable_confirmation" && <p className="form-alert" role="alert">Escribe DESHABILITAR exactamente para confirmar.</p>}
    {notice === "delete_confirmation" && <p className="form-alert" role="alert">Para eliminar la cuenta debes escribir tu correo y ELIMINAR exactamente.</p>}
    {notice === "delete_error" && <p className="form-alert" role="alert">No pudimos eliminar la cuenta. Inténtalo nuevamente o contacta a soporte.</p>}
    <form action="/api/mi-cuenta/datos" method="post" className="account-details-form">
      <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} defaultValue={record.displayName ?? ""} placeholder="Ej. Valentina" /></label>
      <label>Nombre de usuario<input name="username" required minLength={3} maxLength={48} defaultValue={record.username ?? ""} autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="Ej. valentina-concepcion" /><small>Se usa para identificar tu cuenta y para recibir acceso a contenido exclusivo. No puede coincidir con otro usuario ni con el @ de un anuncio.</small></label>
      <AccountIdentityFields values={{ fullName: record.firstName, documentType: record.documentType, documentNumber: record.documentNumber, foreignCountry: record.foreignCountry, birthDate: record.birthDate, city: record.city, phone: record.phone }} birthDateReadOnly />
      <label>Correo electrónico<input value={record.email} readOnly aria-readonly="true" /><small>El correo no se puede modificar desde aquí.</small></label>
      <div className="account-details-actions"><Link className="button button-outline" href="/mi-cuenta">Cancelar</Link><button className="button button-primary" type="submit">Guardar datos</button></div>
    </form>
    <section className="account-password-panel"><div><p className="eyebrow">ACCESO</p><h2>Cambiar contraseña</h2><p>Estás dentro de tu cuenta, por lo que puedes definir una clave nueva sin ingresar la anterior ni esperar un correo.</p></div><form action="/api/mi-cuenta/datos" method="post"><input name="action" type="hidden" value="change_password" /><PasswordChangeForm /><button className="button button-primary" type="submit">Actualizar contraseña</button></form></section>
    <section className="account-danger-panel"><div><p className="eyebrow">SEGURIDAD Y CUENTA</p><h2>Deshabilitar o eliminar</h2><p>Deshabilitar es reversible: cierra tus sesiones y oculta tus anuncios sin borrar datos. Eliminar es permanente y borra la cuenta, anuncios, medios, accesos y actividad asociada.</p></div>
      <div className="account-danger-actions">
        <details><summary>Deshabilitar temporalmente</summary><form action="/api/mi-cuenta/estado" method="post"><p>Podrás restablecerla al volver a iniciar sesión. Si Chile3X también aplica un bloqueo, solo la administración podrá retirarlo.</p><label>Escribe DESHABILITAR<input name="confirmation" required autoComplete="off" /></label><button className="button button-outline" type="submit">Deshabilitar mi cuenta</button></form></details>
        <details className="is-destructive"><summary>Eliminar cuenta permanentemente</summary><form action="/api/mi-cuenta/eliminar" method="post"><p>Esta acción no se puede deshacer. Podrás registrarte nuevamente, pero recuperarás una cuenta nueva y no sus datos anteriores.</p><label>Confirma tu correo<input name="email" type="email" required autoComplete="email" /></label><label>Escribe ELIMINAR<input name="confirmation" required autoComplete="off" /></label><button className="button button-danger" type="submit">Eliminar cuenta permanentemente</button></form></details>
      </div>
    </section>
  </div></AccountShell>;
}
