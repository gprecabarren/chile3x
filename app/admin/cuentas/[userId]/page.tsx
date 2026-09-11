import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountIdentityFields } from "@/app/account-identity-fields";
import { getDb } from "@/db";
import { accountDeletionHistory, profiles, telegramAccountLinks, telegramMemberships, users } from "@/db/schema";
import { getCurrentAdmin, safeAdminReturnTo, sha256 } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { profilePublicPath } from "@/lib/profile";
import { AdminPageHeading, AdminShell } from "../../_components";
import { AdminPasswordField } from "../AdminPasswordField";
import { formatRegionName } from "@/app/locations";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  details_saved: "Los datos de la cuenta fueron actualizados.",
  details_invalid: "Revisa los datos obligatorios de la cuenta.",
  duplicate_rut: "Ya existe otra cuenta con ese RUT.",
  password_invalid: "La nueva contraseña no cumple el mínimo requerido.",
  password_updated: "La contraseña fue actualizada y se cerraron las sesiones activas de esa cuenta.",
  reset_link_sent: "El enlace para restablecer la contraseña fue enviado al correo de la cuenta.",
  reset_delivery_error: "No fue posible entregar el correo. Revisa la configuración de correo antes de intentarlo nuevamente.",
  account_error: "No fue posible realizar esa acción en esta cuenta.",
  status_updated: "El bloqueo administrativo de la cuenta fue actualizado.",
  delete_confirmation: "Para eliminar la cuenta debes escribir su correo y ELIMINAR exactamente.",
  delete_error: "No fue posible eliminar permanentemente esa cuenta.",
  telegram_banned: "La identidad fue vetada de la comunidad pública y del espacio de Miembros.",
  telegram_unbanned: "El veto fue retirado. La persona deberá solicitar nuevamente su ingreso a Miembros.",
  telegram_error: "No fue posible actualizar el acceso de Telegram de esta cuenta.",
};

function statusLabel(status: string) {
  return ({ approved: "Publicado", draft: "Borrador", expired: "Vencido", paused: "Pausado", pending: "En revisión", rejected: "Requiere cambios" } as Record<string, string>)[status] ?? status;
}

function typeLabel(type: string) {
  return ({ escort: "Escort", agency: "Agencia", rental: "Arriendo" } as Record<string, string>)[type] ?? type;
}

function telegramLinkStatus(status: string) {
  return ({ linked: "Vinculada", revoked: "Revocada", banned: "Vetada" } as Record<string, string>)[status] ?? status;
}

function telegramMembershipStatus(status: string) {
  return ({ pending: "Invitación pendiente", active: "Dentro de Miembros", left: "Salió de Miembros", revoked: "Acceso revocado", banned: "Vetada" } as Record<string, string>)[status] ?? status;
}

export default async function AdminAccountDetailsPage({ params, searchParams }: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ notice?: string; return_to?: string }>;
}) {
  const admin = await getCurrentAdmin();
  const [{ userId }, query, db] = await Promise.all([params, searchParams, getDb()]);
  if (!admin) redirect(`/api/auth/github/start?return_to=/admin/cuentas/${encodeURIComponent(userId)}`);
  if (!adminHasCapability(admin, "accounts.manage")) redirect("/admin/acceso-denegado?reason=permission");

  const [account] = await db.select({
    id: users.id,
    displayName: users.displayName,
    email: users.email,
    role: users.role,
    isActive: users.isActive,
    selfDisabledAt: users.selfDisabledAt,
    adminDisabledAt: users.adminDisabledAt,
    firstName: users.firstName,
    documentType: users.documentType,
    documentNumber: users.documentNumber,
    foreignCountry: users.foreignCountry,
    birthDate: users.birthDate,
    city: users.city,
    phone: users.phone,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!account) redirect("/admin/cuentas?notice=account_missing");

  const [ownedProfiles, deletionHistory, telegramLinks, telegramMembershipRows] = await Promise.all([db.select({
    id: profiles.id,
    displayName: profiles.displayName,
    type: profiles.type,
    status: profiles.status,
    city: profiles.city,
    region: profiles.region,
    slug: profiles.slug,
    handle: profiles.handle,
  }).from(profiles).where(eq(profiles.ownerId, account.id)).orderBy(desc(profiles.updatedAt)), db.select({
    id: accountDeletionHistory.id,
    originalCreatedAt: accountDeletionHistory.originalCreatedAt,
    deletedAt: accountDeletionHistory.deletedAt,
    deletedBy: accountDeletionHistory.deletedBy,
  }).from(accountDeletionHistory).where(eq(accountDeletionHistory.emailHash, await sha256(account.email.trim().toLowerCase()))).orderBy(desc(accountDeletionHistory.deletedAt)), db.select({
    id: telegramAccountLinks.id,
    telegramUserId: telegramAccountLinks.telegramUserId,
    username: telegramAccountLinks.username,
    firstName: telegramAccountLinks.firstName,
    status: telegramAccountLinks.status,
    linkedAt: telegramAccountLinks.linkedAt,
    revokeReason: telegramAccountLinks.revokeReason,
  }).from(telegramAccountLinks).where(eq(telegramAccountLinks.userId, account.id)).limit(1), db.select({
    status: telegramMemberships.status,
    updatedAt: telegramMemberships.updatedAt,
  }).from(telegramMemberships).where(eq(telegramMemberships.userId, account.id)).orderBy(desc(telegramMemberships.updatedAt)).limit(1)]);

  const requestedReturnTo = query.return_to ?? "";
  const returnTo = requestedReturnTo.startsWith("/admin/") ? safeAdminReturnTo(requestedReturnTo) : "/admin/cuentas";
  const detailBaseHref = `/admin/cuentas/${encodeURIComponent(account.id)}`;
  const detailHref = `${detailBaseHref}?return_to=${encodeURIComponent(returnTo)}`;
  const accountName = account.displayName ?? account.email;
  const isProtectedAdmin = account.role === "admin";
  const accountRoleLabel = account.role === "tester" ? "Cuenta de tester" : "Cuenta de anunciante";
  const telegramLink = telegramLinks[0] ?? null;
  const telegramMembership = telegramMembershipRows[0] ?? null;
  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="FICHA DE CUENTA" title={accountName} description={`Administra los datos, contraseña y anuncios de ${account.email}. Los cambios se realizan sin necesidad de conocer la contraseña actual.`} backHref={returnTo}>
      {!isProtectedAdmin && <Link prefetch={false} className="button button-primary" href={`${detailBaseHref}/crear-perfil?return_to=${encodeURIComponent(returnTo)}`}>Crear anuncio para esta cuenta</Link>}
    </AdminPageHeading>
    {query.notice && notices[query.notice] && <p className="admin-success" role="status">{notices[query.notice]}</p>}
    <section className="admin-account-detail-summary"><div className="admin-account-detail-status"><span>Estado efectivo</span><strong className={`account-status ${account.isActive ? "account-status-approved" : "account-status-rejected"}`}>{account.isActive ? "Activa" : "Deshabilitada"}</strong></div><dl><div><dt>Tipo de cuenta</dt><dd>{account.role === "admin" ? "Administrativa protegida" : accountRoleLabel}</dd></div><div><dt>Anuncios asociados</dt><dd>{ownedProfiles.length} anuncio{ownedProfiles.length === 1 ? "" : "s"}</dd></div><div><dt>Deshabilitada por la persona</dt><dd>{account.selfDisabledAt ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(account.selfDisabledAt)) : "No"}</dd></div><div><dt>Bloqueo administrativo</dt><dd>{account.adminDisabledAt ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(account.adminDisabledAt)) : "No"}</dd></div></dl></section>
    {isProtectedAdmin ? <section className="admin-empty"><h2>Cuenta protegida</h2><p>Para prevenir bloqueos accidentales, desde aquí no se modifica una cuenta administrativa.</p></section> : <div className="admin-account-detail-layout">
      <form action={`/api/admin/users/${encodeURIComponent(account.id)}`} method="post" className="admin-settings-form admin-account-details-form">
        <input name="action" type="hidden" value="save_details" />
        <input name="return_to" type="hidden" value={detailHref} />
        <h2>Datos de la cuenta</h2>
        <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} defaultValue={account.displayName ?? ""} placeholder="Ej. Valentina" /></label>
        <AccountIdentityFields values={{ fullName: account.firstName, documentType: account.documentType, documentNumber: account.documentNumber, foreignCountry: account.foreignCountry, birthDate: account.birthDate, city: account.city, phone: account.phone }} />
        <label>Correo electrónico<input value={account.email} readOnly aria-readonly="true" /><small>El correo identifica la cuenta y se modifica solo con un proceso de soporte.</small></label>
        <button className="button button-primary" type="submit">Guardar datos</button>
      </form>
      <section className="admin-account-password-actions"><div><p className="eyebrow">ACCESO</p><h2>Contraseña y recuperación</h2><p>Define una clave nueva directamente o envía un enlace seguro de recuperación al correo registrado.</p></div>
        <form action={`/api/admin/users/${encodeURIComponent(account.id)}`} method="post" className="admin-password-form"><input name="action" type="hidden" value="set_password" /><input name="return_to" type="hidden" value={detailHref} /><AdminPasswordField label="Nueva contraseña" submitLabel="Guardar nueva clave" /></form>
        <form action={`/api/admin/users/${encodeURIComponent(account.id)}`} method="post"><input name="action" type="hidden" value="send_reset" /><input name="return_to" type="hidden" value={detailHref} /><button className="button button-outline" type="submit">Enviar enlace de restablecimiento</button></form>
      </section>
    </div>}
    {!isProtectedAdmin && <section className="admin-account-telegram"><div><p className="eyebrow">COMUNIDAD TELEGRAM</p><h2>Identidad y acceso</h2><p>El vínculo comprueba qué cuenta del sitio corresponde a la identidad de Telegram. El veto se aplica a la comunidad pública y a Miembros, sin afectar el inicio de sesión en Chile3X.</p></div>{telegramLink ? <div className="admin-account-telegram-body"><dl><div><dt>Identidad</dt><dd>{telegramLink.username ? `@${telegramLink.username}` : telegramLink.firstName || "Identidad sin nombre público"}</dd></div><div><dt>Vínculo</dt><dd>{telegramLinkStatus(telegramLink.status)}</dd></div><div><dt>Miembros</dt><dd>{telegramMembership ? telegramMembershipStatus(telegramMembership.status) : "Sin ingreso registrado"}</dd></div><div><dt>Vinculada</dt><dd>{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(telegramLink.linkedAt))}</dd></div></dl>{telegramLink.revokeReason && <p className="admin-account-telegram-reason">Último motivo: {telegramLink.revokeReason}</p>}<div className="admin-account-telegram-actions">{telegramLink.status === "banned" ? <form action={`/api/admin/users/${encodeURIComponent(account.id)}/telegram`} method="post"><input name="return_to" type="hidden" value={detailHref} /><input name="intent" type="hidden" value="unban" /><button className="button button-outline" type="submit">Retirar veto de Telegram</button></form> : telegramLink.status === "linked" ? <details className="is-destructive"><summary>Vetar de Telegram</summary><form action={`/api/admin/users/${encodeURIComponent(account.id)}/telegram`} method="post"><input name="return_to" type="hidden" value={detailHref} /><input name="intent" type="hidden" value="ban" /><p>La identidad será expulsada y vetada de la comunidad pública y del espacio privado de Miembros.</p><label>Motivo<input name="reason" required minLength={5} maxLength={220} /></label><label>Escribe VETAR<input name="confirmation" required autoComplete="off" /></label><button className="button button-danger" type="submit">Confirmar veto</button></form></details> : <p>La persona puede generar un vínculo nuevo desde Mi cuenta cuando su cuenta esté activa.</p>}</div></div> : <p className="admin-media-empty">Esta cuenta todavía no tiene una identidad de Telegram vinculada.</p>}</section>}
    <section className="admin-account-owned-profiles"><div><p className="eyebrow">ANUNCIOS ASOCIADOS</p><h2>Anuncios de esta cuenta</h2></div>{ownedProfiles.length ? <div>{ownedProfiles.map((profile) => { const moderationHref = `/admin/perfiles?q=${encodeURIComponent(account.email)}&return_to=${encodeURIComponent(detailHref)}`; const previewHref = `${profilePublicPath(profile)}?return_to=${encodeURIComponent(moderationHref)}`; return <article key={profile.id}><div><span className={`account-status account-status-${profile.status}`}>{statusLabel(profile.status)}</span><h3>{profile.displayName}</h3><p>{typeLabel(profile.type)} · {profile.city}, {formatRegionName(profile.region)}</p></div><div><Link prefetch={false} className="button button-public-preview" href={previewHref} target="_blank">Ver anuncio público</Link><Link prefetch={false} className="button button-outline" href={moderationHref}>Abrir moderación</Link></div></article>; })}</div> : <p className="admin-media-empty">Esta cuenta aún no tiene anuncios asociados.</p>}</section>
    {!isProtectedAdmin && <section className="admin-account-control-panel"><div><p className="eyebrow">CONTROL DE CUENTA</p><h2>Disponibilidad y eliminación</h2><p>El bloqueo administrativo es independiente de la deshabilitación voluntaria. Quitar el bloqueo de Chile3X no reactiva una cuenta que la propia persona mantenga deshabilitada.</p></div><div className="admin-account-control-actions">
      <form action={`/api/admin/users/${encodeURIComponent(account.id)}/estado`} method="post"><input name="return_to" type="hidden" value={detailHref} /><input name="next_state" type="hidden" value={account.adminDisabledAt ? "active" : "disabled"} /><button className="button button-outline" type="submit">{account.adminDisabledAt ? "Quitar bloqueo administrativo" : "Deshabilitar como administrador"}</button></form>
      <details className="is-destructive"><summary>Eliminar cuenta permanentemente</summary><form action={`/api/admin/users/${encodeURIComponent(account.id)}/eliminar`} method="post"><input name="return_to" type="hidden" value="/admin/cuentas" /><p>Borra la cuenta, anuncios, medios y relaciones. No se puede deshacer. Solo quedará una huella criptográfica para detectar futuros registros con el mismo correo.</p><label>Confirma el correo<input name="email" type="email" required autoComplete="off" /></label><label>Escribe ELIMINAR<input name="confirmation" required autoComplete="off" /></label><button className="button button-danger" type="submit">Eliminar permanentemente</button></form></details>
    </div></section>}
    {!isProtectedAdmin && <section className="admin-account-history"><div><p className="eyebrow">HISTORIAL DE REGISTRO</p><h2>Registros anteriores del mismo correo</h2><p>La comparación usa una huella criptográfica; no conserva el correo de las cuentas eliminadas.</p></div>{deletionHistory.length ? <ol>{deletionHistory.map((entry) => <li key={entry.id}><strong>Cuenta anterior creada {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.originalCreatedAt))}</strong><span>Eliminada {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.deletedAt))} por {entry.deletedBy === "admin" ? "un administrador" : "la persona usuaria"}.</span></li>)}</ol> : <p className="admin-media-empty">No existen eliminaciones anteriores asociadas a este correo.</p>}<p className="admin-account-reregistered">Registro actual: {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(account.createdAt))}{deletionHistory.length ? " · El correo se volvió a registrar después de una eliminación." : ""}</p></section>}
  </div></AdminShell>;
}
