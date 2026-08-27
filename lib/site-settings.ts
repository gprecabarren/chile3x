import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";

export const siteSettingDefaults = {
  listing_open: "open",
  moderation_mode: "manual",
  billing_mode: "manual",
  maintenance_mode: "disabled",
  robots_indexing: "enabled",
  site_url: "https://chile3x.cl",
  site_title: "Escorts en Chile | Chile3X",
  site_description: "Encuentra escorts en Chile por ciudad, región, categoría y servicios. Chile3X es un directorio para adultos con perfiles revisados.",
  google_site_verification: "",
  google_analytics_id: "",
  contact_whatsapp: "56933365005",
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

export async function getSiteSettings(): Promise<SiteSettings> {
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
}

export function siteBaseUrl(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return siteSettingDefaults.site_url;
  }
}
