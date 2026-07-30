import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";

export const siteSettingDefaults = {
  listing_open: "open",
  moderation_mode: "manual",
  billing_mode: "manual",
  maintenance_mode: "disabled",
  robots_indexing: "enabled",
  site_url: "https://chile3x.chile3x-cl.workers.dev",
  site_title: "Chile3X | Directorio adulto en todo Chile",
  site_description: "Directorio para adultos con perfiles, agencias y arriendos en las 16 regiones y ciudades iniciales de Chile.",
  google_site_verification: "",
  google_analytics_id: "",
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
