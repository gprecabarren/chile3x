import type { Metadata } from "next";
import Link from "next/link";
import { privatePageMetadata } from "@/lib/seo";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { MIN_PASSWORD_LENGTH, passwordRequirementText } from "@/lib/password-policy";

export const metadata: Metadata = privatePageMetadata({
  title: "Restablecer contraseña",
  description: "Define una nueva contraseña para tu cuenta de Chile3X.",
  path: "/restablecer-clave",
});

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const params = await searchParams;
  const token = (params.token ?? "").slice(0, 200);
  return <main className="auth-page"><section className="auth-card"><Link className="auth-brand" href="/"><OfficialChile3xLogo priority /></Link><p className="eyebrow">NUEVA CONTRASEÑA</p><h1>Define una clave nueva.</h1><p>El enlace tiene una duración limitada y solo puede usarse una vez.</p>{(!token || params.error) && <p className="form-alert" role="alert">El enlace no es válido o ya venció. Solicita uno nuevo.</p>}<form action="/api/auth/restablecer-clave" method="post" className="auth-form"><input name="token" type="hidden" value={token} /><label>Nueva contraseña<input name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" /><small>{passwordRequirementText}</small></label><button className="button button-primary" type="submit" disabled={!token}>Actualizar contraseña</button></form><p className="auth-switch"><Link href="/recuperar-clave">Solicitar otro enlace</Link></p></section></main>;
}
