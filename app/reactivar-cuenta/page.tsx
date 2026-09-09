import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { ACCOUNT_REACTIVATION_COOKIE, readAccountReactivationIntent } from "@/lib/account-reactivation";
import { safeAccountReturnTo } from "@/lib/auth";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  title: "Restablecer cuenta",
  description: "Confirmación privada para restablecer una cuenta Chile3X.",
  path: "/reactivar-cuenta",
});

export default async function ReactivateAccountPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const token = (await cookies()).get(ACCOUNT_REACTIVATION_COOKIE)?.value;
  const intent = await readAccountReactivationIntent(token);
  const query = await searchParams;
  if (!intent) redirect(`/ingresar?error=verification&return_to=${encodeURIComponent(safeAccountReturnTo(query.return_to ?? null))}`);
  const returnTo = safeAccountReturnTo(query.return_to ?? null);

  return <main className="auth-page"><section className="auth-card account-reactivation-card">
    <Link className="auth-brand" href="/"><OfficialChile3xLogo priority /></Link>
    <p className="eyebrow">RESTABLECER CUENTA</p>
    <h1>¿Quieres volver a activar tu cuenta?</h1>
    <p>La deshabilitaste voluntariamente. Al restablecerla volverás a entrar a tu panel y tus anuncios podrán mostrarse según el estado que ya tenían.</p>
    {intent.adminDisabledAt ? <div className="form-alert" role="alert"><strong>La cuenta también está bloqueada por Chile3X.</strong><p>Solo la administración puede retirar ese bloqueo. Contáctanos para solicitar una revisión.</p><Link href="/contacto">Ir a Contacto</Link></div> : <form action="/api/auth/reactivate" method="post" className="auth-form">
      <input name="return_to" type="hidden" value={returnTo} />
      <label className="auth-check"><input name="confirm" type="checkbox" value="yes" required />Sí, quiero restablecer mi cuenta y volver a acceder.</label>
      <button className="button button-primary" type="submit">Restablecer cuenta</button>
      <Link className="button button-outline" href="/ingresar">No, mantenerla deshabilitada</Link>
    </form>}
  </section></main>;
}
