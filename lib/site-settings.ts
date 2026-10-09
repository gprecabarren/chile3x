import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { cache } from "react";

export const siteSettingDefaults = {
  listing_open: "open",
  moderation_mode: "manual",
  billing_mode: "manual",
  maintenance_mode: "disabled",
  sponsors_enabled: "enabled",
  robots_indexing: "enabled",
  site_url: "https://chile3x.cl",
  site_title: "Escorts y damas de compañía en Chile | Chile3X",
  site_description: "Encuentra escorts y damas de compañía en Chile por ciudad, región, categoría y servicios. Directorio para adultos con perfiles revisados.",
  google_site_verification: "",
  google_analytics_id: "",
  google_oauth_client_id: "",
  apple_sign_in_status: "disabled",
  apple_services_id: "",
  apple_team_id: "",
  apple_key_id: "",
  apple_primary_app_id: "",
  contact_whatsapp: "56933365005",
  contact_whatsapp_label: "Soporte técnico",
  contact_whatsapp_description: "Ayuda con cuentas, acceso, anuncios y problemas técnicos del sitio.",
  contact_whatsapp_message: "Hola, necesito soporte técnico de Chile3X sobre mi cuenta o un anuncio.",
  whatsapp_panel_enabled: "enabled",
  whatsapp_button_label: "Ayuda de Chile3X por WhatsApp",
  whatsapp_panel_title: "¿En qué te ayudamos?",
  whatsapp_panel_description: "Soporte y marketing de Chile3X. No ofrecemos servicios sexuales ni coordinamos citas. Para consultar un anuncio, contacta a su anunciante.",
  whatsapp_extra_contacts: JSON.stringify([{ id: "marketing", label: "Marketing digital", description: "Orientación para publicar y promocionar tus anuncios en Chile3X.", phone: "56950561538", message: "Hola, quisiera orientación de marketing digital para publicar y promocionar mis anuncios en Chile3X.", enabled: true }]),
  contact_telegram: "",
  contact_instagram: "",
  contact_email: "chile3x.site@gmail.com",
  faq_entries: "",
  publication_rules: "",
  publication_rules_updated_at: "2026-07-30T00:00:00.000Z",
  profile_gallery_watermark_enabled: "enabled",
  profile_gallery_face_blur_enabled: "enabled",
} as const;

export type SiteSettingKey = keyof typeof siteSettingDefaults;
export type SiteSettings = Record<SiteSettingKey, string>;

// Settings are read by the layout, header, footer and floating contact button
// during the same server render. Memoizing this function per request prevents
// those components from repeating the same D1 query and keeps public pages
// inside the Workers Free CPU budget. This is not a long-lived cache: an admin
// change is visible on the next request.
export const getSiteSettings = cache(async function getSiteSettings(): Promise<SiteSettings> {
  const values = { ...siteSettingDefaults } as SiteSettings;
  let rows: Array<{ key: string; value: string }>;

  try {
    rows = await (await getDb()).select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings);
  } catch (error) {
    // The static local render test runs outside the Workers runtime. Production
    // requests always use D1; this fallback only keeps the default metadata renderable there.
    if (error instanceof Error && error.message.includes("cloudflare:")) return values;
    throw error;
  }

  for (const row of rows) {
    if (row.key in values) {
      values[row.key as SiteSettingKey] = row.value;
    }
  }

  return values;
});

export function siteBaseUrl(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return siteSettingDefaults.site_url;
  }
}
