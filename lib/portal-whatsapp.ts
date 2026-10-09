export const MAX_WHATSAPP_CONTACTS = 12;
export const WHATSAPP_TEXT_LIMITS = { label: 36, description: 120, message: 400, title: 48, explanation: 220, button: 80 } as const;
export type WhatsappContact = { id: string; label: string; description: string; phone: string; message: string; enabled: boolean };
export type PublicWhatsappContact = Pick<WhatsappContact, "id" | "label" | "description"> & { href: string };
export const whatsappPlacements = ["floating", "header", "footer", "contact", "about", "registration"] as const;
export type WhatsappPlacement = typeof whatsappPlacements[number];
export const whatsappPanelPlacements = ["floating", "header", "footer"] as const;
export type WhatsappPanelPlacement = typeof whatsappPanelPlacements[number];

export function normalizePortalWhatsappPhone(value: string): string | null {
  if (!value.trim()) return "";
  if (value.length > 22 || !/^\+?[\d\s()-]+$/.test(value.trim())) return null;
  let phone = value.replace(/\D/g, "");
  if (/^9\d{8}$/.test(phone)) phone = `56${phone}`;
  return /^[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

export function portalWhatsappHref(phone: string, message: string) {
  const normalized = normalizePortalWhatsappPhone(phone);
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(message)}` : null;
}

export function validateWhatsappContacts(value: string, limits: { label: number; description: number; message: number } = WHATSAPP_TEXT_LIMITS): WhatsappContact[] | null {
  if (value.length > 16000) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length > MAX_WHATSAPP_CONTACTS) return null;
    const ids = new Set<string>();
    const contacts: WhatsappContact[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const entry = item as Record<string, unknown>;
      if (typeof entry.id !== "string" || !/^[a-z][a-z0-9_-]{1,59}$/.test(entry.id) || ["support", "panel"].includes(entry.id) || ids.has(entry.id)) return null;
      if (typeof entry.enabled !== "boolean") return null;
      const strings = ["label", "description", "phone", "message"] as const;
      if (strings.some(key => typeof entry[key] !== "string")) return null;
      const label = (entry.label as string).trim();
      const description = (entry.description as string).trim();
      const message = (entry.message as string).trim();
      const phone = normalizePortalWhatsappPhone(entry.phone as string);
      if (!label || label.length > limits.label || !description || description.length > limits.description || !message || message.length > limits.message || phone === null || (entry.enabled && !phone)) return null;
      ids.add(entry.id);
      contacts.push({ id: entry.id, label, description, phone, message, enabled: entry.enabled });
    }
    return contacts;
  } catch { return null; }
}

export function readWhatsappContacts(value: string): WhatsappContact[] {
  // Retain older saved contacts while bounding their compact display fields.
  // Every new save uses the stricter validation above.
  return (validateWhatsappContacts(value, { label: 60, description: 240, message: 400 }) ?? []).map(contact => ({
    ...contact, label: contact.label.slice(0, WHATSAPP_TEXT_LIMITS.label), description: contact.description.slice(0, WHATSAPP_TEXT_LIMITS.description),
  }));
}

type WhatsappSettings = {
  contact_whatsapp: string; contact_whatsapp_label: string; contact_whatsapp_description: string;
  contact_whatsapp_message: string; whatsapp_extra_contacts: string;
};

export function publicWhatsappContacts(settings: WhatsappSettings): PublicWhatsappContact[] {
  const principal = portalWhatsappHref(settings.contact_whatsapp, settings.contact_whatsapp_message);
  const contacts: PublicWhatsappContact[] = principal ? [{ id: "support", label: settings.contact_whatsapp_label.slice(0, WHATSAPP_TEXT_LIMITS.label), description: settings.contact_whatsapp_description.slice(0, WHATSAPP_TEXT_LIMITS.description), href: principal }] : [];
  for (const entry of readWhatsappContacts(settings.whatsapp_extra_contacts)) {
    const href = entry.enabled ? portalWhatsappHref(entry.phone, entry.message) : null;
    if (href) contacts.push({ id: entry.id, label: entry.label, description: entry.description, href });
  }
  return contacts;
}

export function validateWhatsappEvent(payload: unknown): { action: "panel_open" | "contact_click"; contactId: string; placement: WhatsappPlacement } | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const entry = payload as Record<string, unknown>;
  if (!whatsappPlacements.includes(entry.placement as WhatsappPlacement)) return null;
  const panelSource = whatsappPanelPlacements.includes(entry.placement as WhatsappPanelPlacement);
  if (entry.action === "panel_open" && entry.contactId === "panel" && panelSource) return { action: "panel_open", contactId: "panel", placement: entry.placement as WhatsappPlacement };
  if (entry.action !== "contact_click" || typeof entry.contactId !== "string" || !/^[a-z][a-z0-9_-]{1,59}$/.test(entry.contactId) || entry.contactId === "panel") return null;
  if (!panelSource && entry.contactId !== "support") return null;
  return { action: "contact_click", contactId: entry.contactId, placement: entry.placement as WhatsappPlacement };
}
