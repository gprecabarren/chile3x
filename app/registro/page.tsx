import type { Metadata } from "next";
import Link from "next/link";
import { AccountIdentityFields } from "@/app/account-identity-fields";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { RegistrationEmailField } from "@/app/registro/RegistrationEmailField";
import { safeAccountReturnTo } from "@/lib/auth";
import { getPortalWhatsappLink } from "@/lib/site-contacts";
import { PortalWhatsappLink } from "@/app/PortalWhatsappLink";
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
import { AppleSignInButton } from "@/app/AppleSignInButton";
import { APPLE_REGISTRATION_COOKIE, readAppleRegistrationIntent } from "@/lib/apple-registration";
import { getXAuthConfig, readXRegistrationIntent } from "@/lib/x-auth";
import { X_REGISTRATION_COOKIE } from "@/lib/x-oauth";
import { XSignInButton } from "@/app/XSignInButton";

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
  apple_unavailable: "El registro con Apple todavía no está habilitado.",
  apple_invalid: "Apple no entregó una respuesta válida. Inténtalo nuevamente.",
  apple_state: "La solicitud de Apple venció o ya fue utilizada. Inicia el proceso nuevamente.",
  apple_cancelled: "Cancelaste el registro con Apple. No se realizó ningún cambio.",
  apple_admin_email: "Ese correo está reservado para una identidad administrativa y no puede registrarse como anunciante o tester.",
  apple_conflict_google: "Ese correo ya está registrado con Google. Ingresa usando Google para evitar identidades duplicadas.",
  apple_conflict: "Ese correo ya está vinculado a otra cuenta de Apple.",
  apple_server: "Apple no está disponible temporalmente. Inténtalo nuevamente más tarde.",
  apple_unlinked: "Desvinculaste Apple de esta cuenta. Ingresa con correo y contraseña.",
  x_unavailable: "El acceso con X todavía no está habilitado.",
  x_state: "La solicitud de X venció o no corresponde a este navegador. Inténtalo nuevamente.",
  x_invalid: "X no entregó una respuesta válida. Inténtalo nuevamente.",
  x_cancelled: "Cancelaste el acceso con X. No se realizó ningún cambio.",
  x_existing: "Ese correo ya tiene una cuenta. Ingresa con tu método actual y vincula X desde Mis datos.",
  x_blocked: "Tu cuenta está deshabilitada. Contacta a soporte.",
  x_server: "X no está disponible temporalmente. Inténtalo nuevamente más tarde.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string; google_notice?: string; apple_notice?: string; x_notice?: string; notice?: string }> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const saved = decodeRegistrationState(cookieStore.get(registrationStateCookie)?.value);
  const googleIdentity = await readGoogleRegistrationIntent(cookieStore.get(GOOGLE_REGISTRATION_COOKIE)?.value);
  const appleIdentity = await readAppleRegistrationIntent(cookieStore.get(APPLE_REGISTRATION_COOKIE)?.value);
  const xIdentity = await readXRegistrationIntent(cookieStore.get(X_REGISTRATION_COOKIE)?.value);
  const xEnabled = Boolean(await getXAuthConfig());
  const providerIdentity = xIdentity ?? appleIdentity ?? googleIdentity;
  const providerName = xIdentity ? "X" : appleIdentity ? "Apple" : googleIdentity ? "Google" : null;
  const providerEmailVerified = Boolean(providerIdentity?.email);
  const returnTo = safeAccountReturnTo(params.return_to ?? null);
  const settings = await getSiteSettings();
  const whatsappHref = getPortalWhatsappLink(settings.contact_whatsapp, "Hola, quisiera solicitar que el equipo de Chile3X me cree una cuenta de anunciante.");
  const loginHref = `/ingresar?return_to=${encodeURIComponent(returnTo)}`;

  return <main className="auth-page"><section className="auth-card auth-register-card">
    {whatsappHref && <PortalWhatsappLink placement="registration" className="button button-outline auth-whatsapp-request auth-whatsapp-request-top" href={whatsappHref} target="_blank" rel="noopener noreferrer">Solicitar creación de cuenta por WhatsApp</PortalWhatsappLink>}
    <div className="auth-register-topbar"><Link className="auth-brand" href="/"><OfficialChile3xLogo priority /></Link><p className="auth-login-shortcut">¿Ya tienes cuenta? <Link href={loginHref}>Ingresar</Link></p></div>
    <p className="eyebrow">CUENTA DE ANUNCIANTE</p>
    <h1>Crea tu cuenta para empezar a publicar.</h1>
    <p>{providerIdentity ? providerEmailVerified ? `Tu correo ya fue verificado por ${providerName}. Completa los datos restantes para entrar a tu panel.` : "X confirmó tu identidad. Completa los datos y tu correo; tendrás 7 días para verificarlo desde Mi cuenta." : "Guarda borradores, envía anuncios a revisión y controla su visibilidad desde el primer día. Tendrás 7 días para verificar tu correo."}</p>
    {params.notice === "account_deleted" && <p className="auth-success" role="status">Tu cuenta y sus datos fueron eliminados. Si quieres volver, puedes crear una cuenta completamente nueva.</p>}
    <div className="auth-provider-list">
      {settings.google_oauth_client_id && <GoogleSignInButton clientId={settings.google_oauth_client_id} intent="register" returnTo={returnTo} />}
      <XSignInButton enabled={xEnabled} intent="register" returnTo={returnTo} />
      <AppleSignInButton enabled={settings.apple_sign_in_status === "enabled"} intent="register" returnTo={returnTo} />
    </div>
    <div className="auth-divider"><span>o completa el formulario</span></div>
    {params.google_notice === "new" && <p className="auth-google-notice" role="status">No existía una cuenta con ese correo de Google. Completa los datos restantes para crearla.</p>}
    {params.apple_notice === "new" && <p className="auth-google-notice" role="status">No existía una cuenta con ese correo de Apple. Completa los datos restantes para crearla.</p>}
    {googleIdentity && <p className="auth-google-connected" role="status"><strong>Google verificado</strong><span>{googleIdentity.email}</span></p>}
    {appleIdentity && <p className="auth-google-connected" role="status"><strong>Apple verificado</strong><span>{appleIdentity.email}</span></p>}
    {xIdentity && <p className="auth-google-connected" role="status"><strong>X conectado</strong><span>@{xIdentity.username}{xIdentity.email ? ` · ${xIdentity.email}` : " · Completa tu correo"}</span></p>}
    {params.error && <p className="form-alert" role="alert">{messages[params.error] ?? messages.server}{params.error === "duplicate_rut" && <> <Link href="/recuperar-clave">Recuperar contraseña</Link></>}</p>}
    <form action="/api/auth/register" method="post" className="auth-form">
      <input name="return_to" type="hidden" value={returnTo} />
      <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} autoComplete="nickname" defaultValue={saved?.displayName || providerIdentity?.displayName || ""} placeholder="Ej. Valentina" /></label>
      <AccountIdentityFields values={saved ? { fullName: saved.fullName || providerIdentity?.fullName, documentType: saved.documentType, documentNumber: saved.documentNumber, foreignCountry: saved.foreignCountry, birthDate: saved.birthDate, region: saved.region, city: saved.city, phone: saved.phone } : providerIdentity ? { fullName: providerIdentity.fullName } : undefined} />
      <RegistrationEmailField defaultValue={providerIdentity?.email ?? saved?.email ?? ""} locked={providerEmailVerified} />
      {!providerIdentity && <RegistrationPasswordFields />}
      <RegistrationConsentFields adultConfirmed={saved?.adultConfirmed} legalConfirmed={saved?.legalConfirmed} />
      <AuthTurnstile action={TURNSTILE_AUTH_REGISTER_ACTION} />
      {!providerName && <p className="auth-registration-note">Entra y prepara tu anuncio al registrarte. Tendrás 7 días para verificar tu correo desde Mi cuenta.</p>}
      <button className="button button-primary" type="submit">{providerName ? `Crear cuenta con ${providerName}` : "Crear cuenta"}</button>
    </form>
    {whatsappHref && <PortalWhatsappLink placement="registration" className="button button-outline auth-whatsapp-request" href={whatsappHref} target="_blank" rel="noopener noreferrer">Solicitar creación de cuenta por WhatsApp</PortalWhatsappLink>}
    <p className="auth-switch">¿Ya tienes una cuenta? <Link href={loginHref}>Ingresar</Link></p>
  </section></main>;
}
