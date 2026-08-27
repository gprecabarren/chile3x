import type { Metadata } from "next";
import Link from "next/link";
import { AccountIdentityFields } from "@/app/account-identity-fields";
import { OfficialChile3xLogo } from "@/app/OfficialChile3xLogo";
import { RegistrationEmailField } from "@/app/registro/RegistrationEmailField";
import { safeAccountReturnTo } from "@/lib/auth";
import { getPortalWhatsappLink } from "@/lib/site-contacts";
import { getSiteSettings } from "@/lib/site-settings";
import { AuthTurnstile } from "@/app/AuthTurnstile";
import { cookies } from "next/headers";
import { decodeRegistrationState, registrationStateCookie } from "@/lib/registration-state";
import { TURNSTILE_AUTH_REGISTER_ACTION } from "@/lib/turnstile";
import { privatePageMetadata } from "@/lib/seo";
import { passwordRequirementText } from "@/lib/password-policy";
import { RegistrationPasswordFields } from "./RegistrationPasswordFields";

export const metadata: Metadata = privatePageMetadata({
  title: "Crear cuenta de anunciante",
  description: "Crea una cuenta de anunciante para publicar y gestionar perfiles en Chile3X.",
  path: "/registro",
});

const messages: Record<string, string> = {
  adult: "Debes confirmar que eres mayor de 18 años.",
  duplicate: "Ese correo ya tiene una cuenta. Puedes iniciar sesión.",
  display_name: "Escribe un nombre visible de al menos dos caracteres.",
  email: "Escribe un correo electrónico válido.",
  identity: "Revisa documento, país emisor (si corresponde), fecha de nacimiento y ciudad de Chile.",
  password: passwordRequirementText,
  password_mismatch: "Las contraseñas no coinciden. Vuelve a escribirlas.",
  duplicate_rut: "Ya existe una cuenta con este RUT. Si es tuya, puedes recuperar la contraseña.",
  server: "No fue posible crear la cuenta en este momento. Inténtalo nuevamente en unos minutos.",
  antispam: "No pudimos validar la protección de seguridad. Inténtalo nuevamente.",
  legal: "Debes aceptar los Términos y condiciones y la Política de privacidad.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string; return_to?: string }> }) {
  const params = await searchParams;
  const saved = decodeRegistrationState((await cookies()).get(registrationStateCookie)?.value);
  const returnTo = safeAccountReturnTo(params.return_to ?? null);
  const settings = await getSiteSettings();
  const whatsappHref = getPortalWhatsappLink(settings.contact_whatsapp, "Hola, quisiera solicitar que el equipo de Chile3X me cree una cuenta de anunciante.");

  return <main className="auth-page"><section className="auth-card">
    <Link className="auth-brand" href="/"><OfficialChile3xLogo priority /></Link>
    <p className="eyebrow">CUENTA DE ANUNCIANTE</p>
    <h1>Comienza tu publicación.</h1>
    <p>Crea una cuenta para guardar borradores, enviar avisos a revisión y gestionar sus pausas. Antes de entrar te enviaremos un correo de verificación.</p>
    {params.error && <p className="form-alert" role="alert">{messages[params.error] ?? messages.invalid}{params.error === "duplicate_rut" && <> <Link href="/recuperar-clave">Recuperar contraseña</Link></>}</p>}
    <form action="/api/auth/register" method="post" className="auth-form">
      <input name="return_to" type="hidden" value={returnTo} />
      <label>Nombre visible<input name="display_name" required minLength={2} maxLength={80} autoComplete="nickname" defaultValue={saved?.displayName ?? ""} placeholder="Ej. Valentina" /></label>
      <AccountIdentityFields values={saved ? { fullName: saved.fullName, documentType: saved.documentType, documentNumber: saved.documentNumber, foreignCountry: saved.foreignCountry, birthDate: saved.birthDate, city: saved.city, phone: saved.phone } : undefined} />
      <RegistrationEmailField defaultValue={saved?.email ?? ""} />
      <RegistrationPasswordFields />
      <label className="checkbox-label"><input name="adult_confirmed" type="checkbox" value="yes" required defaultChecked={saved?.adultConfirmed ?? false} />Confirmo que soy mayor de 18 años.</label>
      <label className="checkbox-label"><input name="legal_confirmed" type="checkbox" value="yes" required defaultChecked={saved?.legalConfirmed ?? false} />Leí y acepto los <Link href="/terminos">Términos y condiciones</Link> y la <Link href="/privacidad">Política de privacidad</Link>.</label>
      <AuthTurnstile action={TURNSTILE_AUTH_REGISTER_ACTION} />
      <button className="button button-primary" type="submit">Crear cuenta y verificar correo</button>
    </form>
    {whatsappHref && <a className="button button-outline auth-whatsapp-request" href={whatsappHref} target="_blank" rel="noreferrer">Solicitar creación de cuenta por WhatsApp</a>}
    <p className="auth-switch">¿Ya tienes una cuenta? <Link href={`/ingresar?return_to=${encodeURIComponent(returnTo)}`}>Ingresar</Link></p>
  </section></main>;
}
