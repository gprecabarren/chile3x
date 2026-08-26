import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountIdentityFields } from "@/app/account-identity-fields";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
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
};

function statusLabel(status: string) {
  return ({ approved: "Publicado", draft: "Borrador", expired: "Vencido", paused: "Pausado", pending: "En revisión", rejected: "Requiere cambios" } as Record<string, string>)[status] ?? status;
}

function typeLabel(type: string) {
  return ({ escort: "Escort", agency: "Agencia", rental: "Arriendo" } as Record<string, string>)[type] ?? type;
}

export default async function AdminAccountDetailsPage({ params, searchParams }: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const admin = await getCurrentAdmin();
  const [{ userId }, query, db] = await Promise.all([params, searchParams, getDb()]);
  if (!admin) redirect(`/api/auth/github/start?return_to=/admin/cuentas/${encodeURIComponent(userId)}`);

  const [account] = await db.select({
    id: users.id,
    displayName: users.displayName,
    email: users.email,
    role: users.role,
    isActive: users.isActive,
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

  const ownedProfiles = await db.select({
    id: profiles.id,
    displayName: profiles.displayName,
    type: profiles.type,
    status: profiles.status,
    city: profiles.city,
    region: profiles.region,
    slug: profiles.slug,
    handle: profiles.handle,
  }).from(profiles).where(eq(profiles.ownerId, account.id)).orderBy(desc(profiles.updatedAt));

  const detailHref = `/admin/cuentas/${encodeURIComponent(account.id)}`;
  const accountName = account.displayName ?? account.email;
  const isProtectedAdmin = account.role === "admin";
  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="FICHA DE CUENTA" title={accountName} description={`Administra los datos, contraseña y avisos de ${account.email}. Los cambios se realizan sin necesidad de conocer la contraseña actual.`} backHref="/admin/cuentas">
      {!isProtectedAdmin && <Link className="button button-primary" href={`${detailHref}/crear-perfil`}>Crear perfil para esta cuenta</Link>}
    </AdminPageHeading>
    {query.notice && notices[query.notice] && <p className="admin-success" role="status">{notices[query.notice]}</p>}
    <section className="admin-account-detail-summary"><div><span className={`account-status ${account.isActive ? "account-status-approved" : "account-status-rejected"}`}>{account.isActive ? "Activa" : "Deshabilitada"}</span><strong>{account.role === "admin" ? "Cuenta administrativa protegida" : "Cuenta de anunciante"}</strong></div><p>{ownedProfiles.length} anuncio{ownedProfiles.length === 1 ? "" : "s"} asociado{ownedProfiles.length === 1 ? "" : "s"}</p></section>
    {isProtectedAdmin ? <section className="admin-empty"><h2>Cuenta protegida</h2><p>Para prevenir bloqueos accidentales, desde aquí no se modifica una cuenta administrativa.</p></section> : <div className="admin-account-detail-layout">
      <form action={`/api/admin/users/${encodeURIComponent(account.id)}`} method="post" className="admin-settings-form admin-account-details-form">
        <input name="action" type="hidden" value="save_details" />
        <input name="return_to" type="hidden" value={detailHref} />
        <h2>Datos de la cuenta</h2>
        <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} defaultValue={account.displayName ?? ""} /></label>
        <AccountIdentityFields values={{ fullName: account.firstName, documentType: account.documentType, documentNumber: account.documentNumber, foreignCountry: account.foreignCountry, birthDate: account.birthDate, city: account.city, phone: account.phone }} />
        <label>Correo electrónico<input value={account.email} readOnly aria-readonly="true" /><small>El correo identifica la cuenta y se modifica solo con un proceso de soporte.</small></label>
        <button className="button button-primary" type="submit">Guardar datos</button>
      </form>
      <section className="admin-account-password-actions"><div><p className="eyebrow">ACCESO</p><h2>Contraseña y recuperación</h2><p>Define una clave nueva directamente o envía un enlace seguro de recuperación al correo registrado.</p></div>
        <form action={`/api/admin/users/${encodeURIComponent(account.id)}`} method="post" className="admin-password-form"><input name="action" type="hidden" value="set_password" /><input name="return_to" type="hidden" value={detailHref} /><AdminPasswordField label="Nueva contraseña" submitLabel="Guardar nueva clave" /></form>
        <form action={`/api/admin/users/${encodeURIComponent(account.id)}`} method="post"><input name="action" type="hidden" value="send_reset" /><input name="return_to" type="hidden" value={detailHref} /><button className="button button-outline" type="submit">Enviar enlace de restablecimiento</button></form>
      </section>
    </div>}
    <section className="admin-account-owned-profiles"><div><p className="eyebrow">ANUNCIOS ASOCIADOS</p><h2>Perfiles de esta cuenta</h2></div>{ownedProfiles.length ? <div>{ownedProfiles.map((profile) => { const moderationHref = `/admin/perfiles?q=${encodeURIComponent(account.email)}&return_to=${encodeURIComponent(detailHref)}`; const previewHref = `${profilePublicPath(profile)}?return_to=${encodeURIComponent(moderationHref)}`; return <article key={profile.id}><div><span className={`account-status account-status-${profile.status}`}>{statusLabel(profile.status)}</span><h3>{profile.displayName}</h3><p>{typeLabel(profile.type)} · {profile.city}, {formatRegionName(profile.region)}</p></div><div><Link className="button button-public-preview" href={previewHref} target="_blank">Ver perfil</Link><Link className="button button-outline" href={moderationHref}>Abrir moderación</Link></div></article>; })}</div> : <p className="admin-media-empty">Esta cuenta aún no tiene anuncios asociados.</p>}</section>
  </div></AdminShell>;
}
