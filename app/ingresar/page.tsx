import { ActionButton } from "@/app/ActionButton";
import type { Metadata } from "next";
import Link from "@/app/NavigationLink";
import { safeAccountReturnTo } from "@/lib/auth";
import { AuthTurnstile } from "@/app/AuthTurnstile";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { TURNSTILE_AUTH_LOGIN_ACTION } from "@/lib/turnstile";
import { privatePageMetadata } from "@/lib/seo";
import { GoogleSignInButton } from "@/app/GoogleSignInButton";
import { getSiteSettings } from "@/lib/site-settings";
import { AppleSignInButton } from "@/app/AppleSignInButton";
import { XSignInButton } from "@/app/XSignInButton";
import { getXAuthConfig } from "@/lib/x-auth";
import { PasswordEntry } from "@/app/PasswordEntry";
import { cookies } from "next/headers";
import { LOGIN_EMAIL_COOKIE, loginEmail } from "@/lib/login-form-state";
import "./login-controls.css";

export const metadata: Metadata = privatePageMetadata({
  title: "Ingresar",
  description: "Acceso privado a cuentas de anunciante de Chile3X.",
  path: "/ingresar",
});

const messages: Record<string, string> = {
  session_conflict: "Se detectaron sesiones de usuario y administración abiertas a la vez. Por seguridad se cerraron en este navegador. Ingresa nuevamente con una sola identidad; para cambiar de panel se cerrará la sesión anterior.",
  session_changed: "Tu sesión terminó o cambió en otra pestaña. La vista anterior se cerró para evitar mezclar identidades. Ingresa con la cuenta que deseas utilizar.",
  browser_session_required: "Actualizamos la protección de acceso de este navegador. Revisa que permitas las cookies necesarias y vuelve a intentarlo. No se creó una cuenta ni se guardaron cambios con el intento anterior.",
  invalid: "El correo o la contraseña no coinciden.",
  email_format: "Escribe un correo electrónico válido.",
  email_unknown: "No encontramos una cuenta registrada con ese correo. Revisa cómo lo escribiste o crea una cuenta.",
  password_required: "Escribe tu contraseña para ingresar.",
  password_incorrect: "La contraseña es incorrecta. Inténtalo otra vez o usa «Olvidé mi contraseña».",
  disabled: "Tu cuenta está deshabilitada.",
  admin_disabled: "Tu cuenta fue deshabilitada por Chile3X. Solo la administración puede restablecerla; si necesitas una revisión, contáctanos.",
  verification: "El enlace de verificación no es válido o ya venció. Solicita uno nuevo.",
  antispam: "No pudimos validar la protección de seguridad. Inténtalo nuevamente.",
  apple_unavailable: "El acceso con Apple todavía no está habilitado.",
  apple_invalid: "Apple no entregó una respuesta válida. Inténtalo nuevamente.",
  apple_state: "La solicitud de Apple venció o ya fue utilizada. Inicia el proceso nuevamente.",
  apple_cancelled: "Cancelaste el acceso con Apple. No se realizó ningún cambio.",
  apple_admin_email: "Ese correo está reservado para una identidad administrativa y solo puede ingresar mediante GitHub.",
  apple_conflict_google: "Ese correo ya está registrado con Google. Ingresa usando Google para evitar identidades duplicadas.",
  apple_conflict: "Ese correo ya está vinculado a otra cuenta de Apple.",
  apple_server: "Apple no está disponible temporalmente. Inténtalo nuevamente más tarde.",
  apple_unlinked: "Desvinculaste Apple de esta cuenta. Ingresa con correo y contraseña.",
  admin_email: "Las cuentas administrativas ingresan únicamente mediante GitHub.",
  x_unavailable: "El acceso con X todavía no está habilitado.",
  x_state: "La solicitud de X venció o no corresponde a este navegador. Inténtalo nuevamente.",
  x_invalid: "X no entregó una respuesta válida. Inténtalo nuevamente.",
  x_cancelled: "Cancelaste el acceso con X. No se realizó ningún cambio.",
  x_existing: "Ese correo ya tiene una cuenta. Ingresa con tu método actual y vincula X desde Mis datos.",
  x_blocked: "Tu cuenta está deshabilitada. Contacta a soporte.",
  x_server: "X no está disponible temporalmente. Inténtalo nuevamente más tarde.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string; verified?: string; reset?: string; closed?: string }> }) {
  const params = await searchParams;
  const returnTo = safeAccountReturnTo(params.return_to ?? null);
  const rememberedEmail = params.error ? loginEmail((await cookies()).get(LOGIN_EMAIL_COOKIE)?.value) : "";
  const settings = await getSiteSettings();
  const xEnabled = Boolean(await getXAuthConfig());
  return <main className="auth-page"><section className="auth-card auth-split-card auth-login-card">
    <div className="auth-intro">
    <Link className="auth-brand" href="/"><OfficialChile3xLogo priority /></Link>
    <p className="eyebrow">CUENTA DE ANUNCIANTE</p><h1>Vuelve a tu panel.</h1><p>Gestiona tus anuncios, actualiza cada publicación y consulta su estado de revisión.</p>
    {params.error && <p id="auth-login-feedback" className="form-alert" role="alert">{messages[params.error] ?? messages.invalid}</p>}
    {params.verified === "1" && <p className="auth-success" role="status">Tu correo fue verificado. Ya puedes iniciar sesión.</p>}
    {params.reset === "1" && <p className="auth-success" role="status">Tu contraseña fue actualizada. Ya puedes iniciar sesión.</p>}
    {params.closed === "1" && <p className="auth-success" role="status">Tu sesión fue cerrada correctamente.</p>}
    {params.closed === "admin" && <p className="auth-success" role="status">La sesión de administrador fue cerrada correctamente.</p>}
    </div><div className="auth-entry">
    <div className="auth-provider-list">
      {settings.google_oauth_client_id && <GoogleSignInButton clientId={settings.google_oauth_client_id} intent="login" returnTo={returnTo} />}
      <XSignInButton enabled={xEnabled} intent="login" returnTo={returnTo} />
      <AppleSignInButton enabled={settings.apple_sign_in_status === "enabled"} intent="login" returnTo={returnTo} />
    </div>
    <div className="auth-divider"><span>o ingresa con tu contraseña</span></div>
    <form action="/api/auth/login" method="post" className="auth-form"><input name="return_to" type="hidden" value={returnTo} /><label>Correo electrónico<input name="email" type="email" required maxLength={160} autoComplete="email" defaultValue={rememberedEmail} aria-invalid={["email_format","email_unknown"].includes(params.error ?? "") || undefined} aria-describedby={params.error ? "auth-login-feedback" : undefined} placeholder="Ej. valentina@correo.cl" /></label><PasswordEntry invalid={["password_required","password_incorrect"].includes(params.error ?? "")} describedBy={params.error ? "auth-login-feedback" : undefined} /><AuthTurnstile action={TURNSTILE_AUTH_LOGIN_ACTION} /><ActionButton className="button button-primary" type="submit">Ingresar</ActionButton></form>
    <p className="auth-switch"><Link href="/recuperar-clave">Olvidé mi contraseña</Link></p>
    <p className="auth-switch">¿Aún no publicas? <Link href={`/registro?return_to=${encodeURIComponent(returnTo)}`}>Crear cuenta</Link></p>
    </div>
  </section></main>;
}
