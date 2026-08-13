import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsEvent } from "@/app/AnalyticsEvent";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { safeAccountReturnTo } from "@/lib/auth";
import { AuthTurnstile } from "@/app/AuthTurnstile";
import { TURNSTILE_AUTH_EMAIL_ACTION } from "@/lib/turnstile";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  title: "Verificar correo",
  description: "Confirma el correo electrónico de tu cuenta Chile3X.",
  path: "/verificar-correo",
});

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    return_to?: string;
    sent?: string;
    resent?: string;
    delivery?: string;
    error?: string;
    created?: string;
  }>;
}) {
  const params = await searchParams;
  const email = (params.email ?? "").slice(0, 160);
  const returnTo = safeAccountReturnTo(params.return_to ?? null);

  return <main className="auth-page">
    {params.created === "1" && <AnalyticsEvent event="sign_up" parameters={{ method: "email" }} dedupeKey="email" />}
    <section className="auth-card">
      <Link className="auth-brand" href="/"><OfficialChile3xLogo priority /></Link>
      <p className="eyebrow">CONFIRMACIÓN DE CORREO</p>
      <h1>Revisa tu correo.</h1>
      <p>{params.delivery === "1" ? "Tu cuenta quedó creada, pero el correo aún no pudo entregarse. Puedes intentar reenviarlo más tarde." : "Enviamos un enlace para verificar tu correo y activar la cuenta."}</p>
      {params.error === "antispam" && <p className="form-alert">No pudimos validar la protección de seguridad.</p>}
      {(params.sent === "1" || params.resent === "1") && <p className="auth-success" role="status">Si el correo existe y está pendiente, enviamos un enlace desde <strong>chile3x.site@gmail.com</strong>. Revisa tu bandeja de entrada y Spam.</p>}
      <form action="/api/auth/reenviar-verificacion" method="post" className="auth-form">
        <input name="return_to" type="hidden" value={returnTo} />
        <label>Correo electrónico<input name="email" type="email" required defaultValue={email} maxLength={160} autoComplete="email" /></label>
        <AuthTurnstile action={TURNSTILE_AUTH_EMAIL_ACTION} />
        <button className="button button-outline" type="submit">Reenviar enlace</button>
      </form>
      <p className="auth-switch"><Link href={`/ingresar?return_to=${encodeURIComponent(returnTo)}`}>Volver a ingresar</Link></p>
    </section>
  </main>;
}
