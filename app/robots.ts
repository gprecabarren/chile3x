import type { MetadataRoute } from "next";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSiteSettings();
  const indexingEnabled = settings.robots_indexing === "enabled";
  const baseUrl = siteBaseUrl(settings.site_url);
  return {
    rules: indexingEnabled
      ? { userAgent: "*", allow: "/", disallow: ["/admin", "/mi-cuenta", "/api/"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
