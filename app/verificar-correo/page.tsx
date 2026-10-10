import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsEvent } from "@/app/AnalyticsEvent";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { getVerificationUser, safeAccountReturnTo } from "@/lib/auth";
import { emailVerificationDeadline, emailVerificationState } from "@/lib/email-verification-policy";
import { EmailVerificationNotice } from "@/app/EmailVerificationNotice";
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
  const [params, user] = await Promise.all([searchParams, getVerificationUser()]);
  const email = user?.email ?? (params.email ?? "").slice(0, 160);
  const returnTo = safeAccountReturnTo(params.return_to ?? null);
  const state = user ? emailVerificationState(user) : null;
  const blocked = state === "blocked";
  const verified = state === "verified";

  return <main className="auth-page">
    {params.created === "1" && <AnalyticsEvent event="sign_up" parameters={{ method: "email" }} dedupeKey="email" />}
    <section className="auth-card">
      <Link className="auth-brand" href="/"><OfficialChile3xLogo priority /></Link>
      <p className="eyebrow">CONFIRMACIÓN DE CORREO</p>
      <h1>{verified ? "Correo verificado." : blocked ? "Recupera tu acceso." : "Verifica tu correo."}</h1>
      <p>{verified ? "Tu correo ya está confirmado. Puedes volver a Mi cuenta." : blocked ? "Terminó el plazo de 7 días. Verifica tu correo para desbloquear el acceso, sin crear otra cuenta." : params.delivery === "1" ? "Tu cuenta quedó creada, pero el correo aún no pudo entregarse. Puedes intentar reenviarlo más tarde." : "Confirma tu correo para proteger la cuenta y mantener el acceso después de los primeros 7 días."}</p>
      {state === "grace" && <EmailVerificationNotice deadline={emailVerificationDeadline(user!)} compact />}
      {state === "exempt" && <p className="auth-success">Administración autorizó una excepción de acceso. Tu correo sigue pendiente de verificar.</p>}
      {blocked && <p className="form-alert">Tus datos y fotos no se borran. Tras 31 días de bloqueo continuo, los anuncios pasan a la papelera recuperable del equipo. Si ya están allí, solicita su restauración a soporte después de verificar.</p>}
      {params.error === "antispam" && <p className="form-alert">No pudimos validar la protección de seguridad.</p>}
      {!verified && (params.sent === "1" || params.resent === "1") && <p className="auth-success" role="status">Si la cuenta está pendiente y no hubo un envío en los últimos 5 minutos, solicitamos un enlace de verificación. Revisa tu bandeja de entrada y Spam; si no llega, inténtalo más tarde o contacta a soporte.</p>}
      {!verified && <><ol className="email-verification-steps"><li>Busca el correo de Chile3X en tu bandeja o Spam.</li><li>Abre «Verificar correo». El enlace dura 24 horas.</li><li>Vuelve a Mi cuenta. En otro dispositivo, inicia sesión.</li></ol><form action="/api/auth/reenviar-verificacion" method="post" className="auth-form">
        <input name="return_to" type="hidden" value={returnTo} />
        <label>Correo electrónico<input name="email" type="email" required defaultValue={email} readOnly={Boolean(user)} maxLength={160} autoComplete="email" placeholder="Ej. valentina@correo.cl" /></label>
        <AuthTurnstile action={TURNSTILE_AUTH_EMAIL_ACTION} />
        <button className="button button-outline" type="submit">Reenviar enlace</button>
      </form></>}
      {user ? <><p className="auth-switch">{!blocked && <Link href={returnTo}>Continuar a Mi cuenta</Link>}</p><form action="/api/auth/session/logout" method="post"><button className="button button-outline" type="submit">Cerrar sesión o cambiar de cuenta</button></form></> : <p className="auth-switch"><Link href={`/ingresar?return_to=${encodeURIComponent(returnTo)}`}>Volver a ingresar</Link></p>}
    </section>
  </main>;
}
