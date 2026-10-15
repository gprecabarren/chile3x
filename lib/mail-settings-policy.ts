export const MAIL_MODES = ["auto", "google", "cloudflare", "disabled"] as const;
export function validMailbox(value: string) {
  return value.length <= 180 && /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(value);
}
export function validGoogleRelay(value: string) {
  if (!value) return true;
  try { const url = new URL(value); return url.origin === "https://script.google.com" && /^\/macros\/s\/[\w-]+\/exec$/.test(url.pathname) && !url.search && !url.hash; } catch { return false; }
}
export function readMailSettingsForm(form: FormData) {
  const values: Record<string, string> = {};
  const keys = ["contact_email", "mail_delivery_mode", "mail_sender_name", "mail_sender_address", "mail_reply_to", "mail_google_relay_url", "mail_alerts_enabled", "mail_alert_recipient", "mail_alert_new_profile", "mail_alert_updated_profile", "mail_alert_media", "mail_inbound_mode", "mail_inbound_address", "mail_inbound_destination", "mail_webmail_url", "mail_inbound_provider"];
  for (const key of keys) {
    const raw = form.get(key);
    if (typeof raw !== "string" || raw.length > (key === "mail_google_relay_url" ? 300 : 180) || /[\r\n\u0000]/.test(raw)) throw new Error(`El campo ${key} no es válido. No se guardaron cambios.`);
    values[key] = raw.trim();
  }
  if (!MAIL_MODES.includes(values.mail_delivery_mode as typeof MAIL_MODES[number])) throw new Error("Selecciona un modo de envío válido.");
  for (const key of ["mail_alerts_enabled", "mail_alert_new_profile", "mail_alert_updated_profile", "mail_alert_media"]) if (!["enabled", "disabled"].includes(values[key])) throw new Error("Revisa los interruptores de notificaciones.");
  for (const key of ["contact_email", "mail_sender_address", "mail_alert_recipient", "mail_inbound_destination"]) if (!validMailbox(values[key])) throw new Error("Revisa el formato de los correos de contacto, remitente y destinatarios.");
  for (const key of ["mail_reply_to", "mail_inbound_address"]) if (values[key] && !validMailbox(values[key])) throw new Error("Revisa los correos de respuestas y recepción.");
  if (!values.mail_sender_name || values.mail_sender_name.length > 60) throw new Error("El nombre del remitente debe tener entre 1 y 60 caracteres.");
  if (!validGoogleRelay(values.mail_google_relay_url)) throw new Error("El relay debe ser una URL oficial de Google Apps Script terminada en /exec, sin parámetros.");
  if (!["disabled", "forward"].includes(values.mail_inbound_mode)) throw new Error("Selecciona un modo de recepción válido.");
  if (values.mail_inbound_mode === "forward" && (!values.mail_inbound_address || values.mail_inbound_address.toLowerCase() === values.mail_inbound_destination.toLowerCase())) throw new Error("El reenvío necesita una dirección de entrada y un destino distinto para evitar bucles.");
  if (values.mail_webmail_url) { try { const url = new URL(values.mail_webmail_url); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); } catch { throw new Error("El webmail debe ser un enlace HTTPS sin credenciales."); } }
  return values;
}
