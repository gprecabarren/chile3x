import Link from "next/link";
import { AccountIdentityFields } from "@/app/account-identity-fields";
import { safeAccountReturnTo } from "@/lib/auth";
import { getPortalWhatsappLink } from "@/lib/site-contacts";
import { getSiteSettings } from "@/lib/site-settings";

const messages: Record<string, string> = {
  adult: "Debes confirmar que eres mayor de 18 años.",
  duplicate: "Ese correo ya tiene una cuenta. Puedes iniciar sesión.",
  invalid: "Revisa los datos ingresados e inténtalo nuevamente.",
  server: "No fue posible crear la cuenta en este momento. Inténtalo nuevamente en unos minutos.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string }> }) {
  const params = await searchParams;
  const returnTo = safeAccountReturnTo(params.return_to ?? null);
  const settings = await getSiteSettings();
  const whatsappHref = getPortalWhatsappLink(settings.contact_whatsapp, "Hola, quisiera solicitar que el equipo de Chile3X me cree una cuenta de anunciante.");

  return <main className="auth-page"><section className="auth-card">
    <Link className="auth-brand" href="/">CHILE<span>3X</span></Link>
    <p className="eyebrow">CUENTA DE ANUNCIANTE</p>
    <h1>Comienza tu publicación.</h1>
    <p>Crea una cuenta para guardar borradores, enviar avisos a revisión y gestionar sus pausas. Antes de entrar te enviaremos un correo de verificación.</p>
    {params.error && <p className="form-alert" role="alert">{messages[params.error] ?? messages.invalid}</p>}
    <form action="/api/auth/register" method="post" className="auth-form">
      <input name="return_to" type="hidden" value={returnTo} />
      <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} autoComplete="nickname" /></label>
      <AccountIdentityFields />
      <label>Correo electrónico<input name="email" type="email" required maxLength={160} autoComplete="email" /></label>
      <label>Contraseña<input name="password" type="password" required minLength={12} autoComplete="new-password" /><small>Usa al menos 12 caracteres.</small></label>
      <label className="checkbox-label"><input name="adult_confirmed" type="checkbox" value="yes" required />Confirmo que soy mayor de 18 años.</label>
      <button className="button button-primary" type="submit">Crear cuenta y verificar correo</button>
    </form>
    {whatsappHref && <a className="button button-outline auth-whatsapp-request" href={whatsappHref} target="_blank" rel="noreferrer">Solicitar creación de cuenta por WhatsApp</a>}
    <p className="auth-switch">¿Ya tienes una cuenta? <Link href={`/ingresar?return_to=${encodeURIComponent(returnTo)}`}>Ingresar</Link></p>
  </section></main>;
}
