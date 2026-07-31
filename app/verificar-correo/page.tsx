import Link from "next/link";
import { safeAccountReturnTo } from "@/lib/auth";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; return_to?: string; sent?: string; resent?: string; delivery?: string }> }) {
  const params = await searchParams;
  const email = (params.email ?? "").slice(0, 160);
  const returnTo = safeAccountReturnTo(params.return_to ?? null);
  return <main className="auth-page"><section className="auth-card"><Link className="auth-brand" href="/">CHILE<span>3X</span></Link><p className="eyebrow">CONFIRMACIÓN DE CORREO</p><h1>Revisa tu correo.</h1><p>{params.delivery === "1" ? "Tu cuenta quedó creada, pero el correo aún no pudo entregarse porque el servicio de correo del portal no está activo. Puedes intentar reenviarlo más tarde." : "Enviamos un enlace para verificar tu correo y activar la cuenta."}</p>{(params.sent === "1" || params.resent === "1") && <p className="auth-success" role="status">Si el correo existe y está pendiente, enviamos un enlace. Revisa también la carpeta de spam.</p>}<form action="/api/auth/reenviar-verificacion" method="post" className="auth-form"><input name="return_to" type="hidden" value={returnTo} /><label>Correo electrónico<input name="email" type="email" required defaultValue={email} maxLength={160} autoComplete="email" /></label><button className="button button-outline" type="submit">Reenviar enlace</button></form><p className="auth-switch"><Link href={`/ingresar?return_to=${encodeURIComponent(returnTo)}`}>Volver a ingresar</Link></p></section></main>;
}
