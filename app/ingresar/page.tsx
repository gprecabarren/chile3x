import type { Metadata } from "next";
import Link from "next/link";
import { safeAccountReturnTo } from "@/lib/auth";
import { AuthTurnstile } from "@/app/AuthTurnstile";
import { TURNSTILE_AUTH_LOGIN_ACTION } from "@/lib/turnstile";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  title: "Ingresar",
  description: "Acceso privado a cuentas de anunciante de Chile3X.",
  path: "/ingresar",
});

const messages: Record<string, string> = {
  invalid: "El correo o la contraseña no coinciden.",
  disabled: "Tu cuenta ha sido deshabilitada. Si crees que es un error, contacta al equipo de Chile3X.",
  verification: "El enlace de verificación no es válido o ya venció. Solicita uno nuevo.",
  antispam: "No pudimos validar la protección de seguridad. Inténtalo nuevamente.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string; verified?: string; reset?: string }> }) {
  const params = await searchParams;
  const returnTo = safeAccountReturnTo(params.return_to ?? null);
  return <main className="auth-page"><section className="auth-card">
    <Link className="auth-brand" href="/">CHILE<span>3X</span></Link>
    <p className="eyebrow">CUENTA DE ANUNCIANTE</p><h1>Vuelve a tu panel.</h1><p>Gestiona tus perfiles, actualiza tu aviso y consulta el estado de revisión.</p>
    {params.error && <p className="form-alert" role="alert">{messages[params.error] ?? messages.invalid}</p>}
    {params.verified === "1" && <p className="auth-success" role="status">Tu correo fue verificado. Ya puedes iniciar sesión.</p>}
    {params.reset === "1" && <p className="auth-success" role="status">Tu contraseña fue actualizada. Ya puedes iniciar sesión.</p>}
    <form action="/api/auth/login" method="post" className="auth-form"><input name="return_to" type="hidden" value={returnTo} /><label>Correo electrónico<input name="email" type="email" required maxLength={160} autoComplete="email" /></label><label>Contraseña<input name="password" type="password" required autoComplete="current-password" /></label><AuthTurnstile action={TURNSTILE_AUTH_LOGIN_ACTION} /><button className="button button-primary" type="submit">Ingresar</button></form>
    <p className="auth-switch"><Link href="/recuperar-clave">Olvidé mi contraseña</Link></p>
    <p className="auth-switch">¿Aún no publicas? <Link href={`/registro?return_to=${encodeURIComponent(returnTo)}`}>Crear cuenta</Link></p>
  </section></main>;
}
