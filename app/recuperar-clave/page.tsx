import type { Metadata } from "next";
import Link from "next/link";
import { AuthTurnstile } from "@/app/AuthTurnstile";
import { TURNSTILE_AUTH_EMAIL_ACTION } from "@/lib/turnstile";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  title: "Recuperar contraseña",
  description: "Recupera el acceso a una cuenta de Chile3X.",
  path: "/recuperar-clave",
});

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string; email?: string }> }) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email.trim().slice(0, 160) : "";
  return <main className="auth-page"><section className="auth-card"><Link className="auth-brand" href="/">CHILE<span>3X</span></Link><p className="eyebrow">RECUPERAR ACCESO</p><h1>¿Olvidaste tu clave?</h1><p>Ingresa tu correo y, si existe una cuenta asociada, enviaremos un enlace seguro para definir una nueva contraseña.</p>{params.error === "antispam" && <p className="form-alert">No pudimos validar la protección de seguridad. Inténtalo nuevamente.</p>}{params.sent === "1" && <p className="auth-success" role="status">Si existe una cuenta asociada a este correo, enviamos un enlace de recuperación desde <strong>chile3x.site@gmail.com</strong>. Revisa tu bandeja de entrada y Spam; el enlace vence en una hora.</p>}<form action="/api/auth/solicitar-recuperacion" method="post" className="auth-form"><label>Correo electrónico<input name="email" type="email" required maxLength={160} autoComplete="email" defaultValue={email} /></label><AuthTurnstile action={TURNSTILE_AUTH_EMAIL_ACTION} /><button className="button button-primary" type="submit">Enviar enlace</button></form><p className="auth-switch"><Link href="/ingresar">Volver a ingresar</Link></p></section></main>;
}
