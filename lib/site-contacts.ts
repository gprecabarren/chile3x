import type { SiteSettings } from "@/lib/site-settings";

export type PortalContact = {
  key: "whatsapp" | "telegram" | "instagram" | "email";
  label: string;
  href: string;
  external: boolean;
};

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function instagramUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z0-9._]{1,30}$/.test(trimmed.replace(/^@/, ""))) return `https://www.instagram.com/${trimmed.replace(/^@/, "")}/`;
  try {
    const url = new URL(trimmed);
    return /^https:$/.test(url.protocol) && (url.hostname === "instagram.com" || url.hostname.endsWith(".instagram.com")) ? url.toString() : null;
  } catch {
    return null;
  }
}

function telegramUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const username = trimmed.replace(/^@/, "");
  if (/^[A-Za-z0-9_]{5,32}$/.test(username)) return `https://t.me/${username}`;
  try {
    const url = new URL(trimmed);
    return /^https:$/.test(url.protocol) && (url.hostname === "t.me" || url.hostname.endsWith(".t.me")) ? url.toString() : null;
  } catch {
    return null;
  }
}

function mailto(value: string) {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : null;
}

export function getPortalWhatsappLink(value: string, message = "Hola, quiero comunicarme con Chile3X.") {
  const number = digits(value);
  return /^\d{8,15}$/.test(number) ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}

export function getPortalContacts(settings: SiteSettings): PortalContact[] {
  const whatsapp = getPortalWhatsappLink(settings.contact_whatsapp);
  const telegram = telegramUrl(settings.contact_telegram);
  const instagram = instagramUrl(settings.contact_instagram);
  const email = mailto(settings.contact_email);
  return [
    whatsapp ? { key: "whatsapp" as const, label: "WhatsApp", href: whatsapp, external: true } : null,
    telegram ? { key: "telegram" as const, label: "Telegram", href: telegram, external: true } : null,
    instagram ? { key: "instagram" as const, label: "Instagram", href: instagram, external: true } : null,
    email ? { key: "email" as const, label: "Correo", href: email, external: false } : null,
  ].filter((contact): contact is PortalContact => Boolean(contact));
}
