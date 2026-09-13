import type { Metadata } from "next";
import Link from "next/link";
import { safeAccountReturnTo } from "@/lib/auth";
import { AuthTurnstile } from "@/app/AuthTurnstile";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { TURNSTILE_AUTH_LOGIN_ACTION } from "@/lib/turnstile";
import { privatePageMetadata } from "@/lib/seo";
import { GoogleSignInButton } from "@/app/GoogleSignInButton";
import { getSiteSettings } from "@/lib/site-settings";
import { AppleSignInButton } from "@/app/AppleSignInButton";

export const metadata: Metadata = privatePageMetadata({
  title: "Ingresar",
  description: "Acceso privado a cuentas de anunciante de Chile3X.",
  path: "/ingresar",
});

const messages: Record<string, string> = {
  invalid: "El correo o la contraseña no coinciden.",
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
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string; verified?: string; reset?: string; closed?: string }> }) {
  const params = await searchParams;
  const returnTo = safeAccountReturnTo(params.return_to ?? null);
  const settings = await getSiteSettings();
  return <main className="auth-page"><section className="auth-card">
    <Link className="auth-brand" href="/"><OfficialChile3xLogo priority /></Link>
    <p className="eyebrow">CUENTA DE ANUNCIANTE</p><h1>Vuelve a tu panel.</h1><p>Gestiona tus anuncios, actualiza cada publicación y consulta su estado de revisión.</p>
    {params.error && <p className="form-alert" role="alert">{messages[params.error] ?? messages.invalid}</p>}
    {params.verified === "1" && <p className="auth-success" role="status">Tu correo fue verificado. Ya puedes iniciar sesión.</p>}
    {params.reset === "1" && <p className="auth-success" role="status">Tu contraseña fue actualizada. Ya puedes iniciar sesión.</p>}
    {params.closed === "1" && <p className="auth-success" role="status">Tu sesión fue cerrada correctamente.</p>}
    {params.closed === "admin" && <p className="auth-success" role="status">La sesión de administrador fue cerrada correctamente.</p>}
    <div className="auth-provider-list">
      {settings.google_oauth_client_id && <GoogleSignInButton clientId={settings.google_oauth_client_id} intent="login" returnTo={returnTo} />}
      <AppleSignInButton enabled={settings.apple_sign_in_status === "enabled"} intent="login" returnTo={returnTo} />
    </div>
    <div className="auth-divider"><span>o ingresa con tu contraseña</span></div>
    <form action="/api/auth/login" method="post" className="auth-form"><input name="return_to" type="hidden" value={returnTo} /><label>Correo electrónico<input name="email" type="email" required maxLength={160} autoComplete="email" placeholder="Ej. valentina@correo.cl" /></label><label>Contraseña<input name="password" type="password" required autoComplete="current-password" placeholder="Tu contraseña" /></label><AuthTurnstile action={TURNSTILE_AUTH_LOGIN_ACTION} /><button className="button button-primary" type="submit">Ingresar</button></form>
    <p className="auth-switch"><Link href="/recuperar-clave">Olvidé mi contraseña</Link></p>
    <p className="auth-switch">¿Aún no publicas? <Link href={`/registro?return_to=${encodeURIComponent(returnTo)}`}>Crear cuenta</Link></p>
  </section></main>;
}
