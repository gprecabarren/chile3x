import type { Metadata } from "next";
import Link from "next/link";
import { AccountIdentityFields } from "@/app/account-identity-fields";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { RegistrationEmailField } from "@/app/registro/RegistrationEmailField";
import { safeAccountReturnTo } from "@/lib/auth";
import { getPortalWhatsappLink } from "@/lib/site-contacts";
import { getSiteSettings } from "@/lib/site-settings";
import { AuthTurnstile } from "@/app/AuthTurnstile";
import { cookies } from "next/headers";
import { decodeRegistrationState, registrationStateCookie } from "@/lib/registration-state";
import { TURNSTILE_AUTH_REGISTER_ACTION } from "@/lib/turnstile";
import { privatePageMetadata } from "@/lib/seo";
import { passwordRequirementText } from "@/lib/password-policy";
import { RegistrationPasswordFields } from "./RegistrationPasswordFields";
import { RegistrationConsentFields } from "./RegistrationConsentFields";
import { GoogleSignInButton } from "@/app/GoogleSignInButton";
import { GOOGLE_REGISTRATION_COOKIE, readGoogleRegistrationIntent } from "@/lib/google-registration";

export const metadata: Metadata = privatePageMetadata({
  title: "Crear cuenta de anunciante",
  description: "Crea una cuenta de anunciante para publicar y gestionar perfiles en Chile3X.",
  path: "/registro",
});

const messages: Record<string, string> = {
  adult: "Debes confirmar que eres mayor de 18 años.",
  duplicate: "Ese correo ya tiene una cuenta. Puedes iniciar sesión.",
  display_name: "Escribe un nombre visible de al menos dos caracteres.",
  email: "Escribe un correo electrónico válido.",
  identity: "Revisa documento, país emisor (si corresponde), fecha de nacimiento, región y ciudad o comuna.",
  password: passwordRequirementText,
  password_mismatch: "Las contraseñas no coinciden. Vuelve a escribirlas.",
  duplicate_rut: "Ya existe una cuenta con este RUT. Si es tuya, puedes recuperar la contraseña.",
  admin_email: "Ese correo está reservado para una identidad administrativa y no puede usarse como cuenta de anunciante o tester.",
  server: "No fue posible crear la cuenta en este momento. Inténtalo nuevamente en unos minutos.",
  antispam: "No pudimos validar la protección de seguridad. Inténtalo nuevamente.",
  legal: "Debes aceptar los Términos y condiciones y la Política de privacidad.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string; google_notice?: string; notice?: string }> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const saved = decodeRegistrationState(cookieStore.get(registrationStateCookie)?.value);
  const googleIdentity = await readGoogleRegistrationIntent(cookieStore.get(GOOGLE_REGISTRATION_COOKIE)?.value);
  const returnTo = safeAccountReturnTo(params.return_to ?? null);
  const settings = await getSiteSettings();
  const whatsappHref = getPortalWhatsappLink(settings.contact_whatsapp, "Hola, quisiera solicitar que el equipo de Chile3X me cree una cuenta de anunciante.");
  const loginHref = `/ingresar?return_to=${encodeURIComponent(returnTo)}`;

  return <main className="auth-page"><section className="auth-card">
    <div className="auth-register-topbar"><Link className="auth-brand" href="/"><OfficialChile3xLogo priority /></Link><p className="auth-login-shortcut">¿Ya tienes cuenta? <Link href={loginHref}>Ingresar</Link></p></div>
    <p className="eyebrow">CUENTA DE ANUNCIANTE</p>
    <h1>Crea tu cuenta para empezar a publicar.</h1>
    <p>{googleIdentity ? "Tu correo ya fue verificado por Google. Completa los datos restantes para entrar a tu panel." : "Guarda borradores, envía anuncios a revisión y controla su visibilidad. Antes de entrar te enviaremos un correo de verificación."}</p>
    {params.notice === "account_deleted" && <p className="auth-success" role="status">Tu cuenta y sus datos fueron eliminados. Si quieres volver, puedes crear una cuenta completamente nueva.</p>}
    {settings.google_oauth_client_id && <GoogleSignInButton clientId={settings.google_oauth_client_id} intent="register" returnTo={returnTo} />}
    {settings.google_oauth_client_id && <div className="auth-divider"><span>o completa el formulario</span></div>}
    {params.google_notice === "new" && <p className="auth-google-notice" role="status">No existía una cuenta con ese correo de Google. Completa los datos restantes para crearla.</p>}
    {googleIdentity && <p className="auth-google-connected" role="status"><strong>Google verificado</strong><span>{googleIdentity.email}</span></p>}
    {params.error && <p className="form-alert" role="alert">{messages[params.error] ?? messages.server}{params.error === "duplicate_rut" && <> <Link href="/recuperar-clave">Recuperar contraseña</Link></>}</p>}
    <form action="/api/auth/register" method="post" className="auth-form">
      <input name="return_to" type="hidden" value={returnTo} />
      <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} autoComplete="nickname" defaultValue={saved?.displayName || googleIdentity?.displayName || ""} placeholder="Ej. Valentina" /></label>
      <AccountIdentityFields values={saved ? { fullName: saved.fullName || googleIdentity?.fullName, documentType: saved.documentType, documentNumber: saved.documentNumber, foreignCountry: saved.foreignCountry, birthDate: saved.birthDate, region: saved.region, city: saved.city, phone: saved.phone } : googleIdentity ? { fullName: googleIdentity.fullName } : undefined} />
      <RegistrationEmailField defaultValue={googleIdentity?.email ?? saved?.email ?? ""} locked={Boolean(googleIdentity)} />
      {!googleIdentity && <RegistrationPasswordFields />}
      <RegistrationConsentFields adultConfirmed={saved?.adultConfirmed} legalConfirmed={saved?.legalConfirmed} />
      <AuthTurnstile action={TURNSTILE_AUTH_REGISTER_ACTION} />
      <button className="button button-primary" type="submit">{googleIdentity ? "Crear cuenta con Google" : "Crear cuenta y verificar correo"}</button>
    </form>
    {whatsappHref && <a className="button button-outline auth-whatsapp-request" href={whatsappHref} target="_blank" rel="noreferrer">Solicitar creación de cuenta por WhatsApp</a>}
    <p className="auth-switch">¿Ya tienes una cuenta? <Link href={loginHref}>Ingresar</Link></p>
  </section></main>;
}
