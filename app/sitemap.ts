import type { MetadataRoute } from "next";
import { cityDirectory } from "@/app/locations";
import { getPublicProfileSitemapRows } from "@/lib/directory";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { getPublicNewsSitemapRows } from "@/lib/news";
import { newsCanonicalUrl, newsIsoDate } from "@/lib/news-seo";
import { profilePublicPath } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [profiles, settings, news] = await Promise.all([getPublicProfileSitemapRows(), getSiteSettings(), getPublicNewsSitemapRows()]);
  const siteUrl = siteBaseUrl(settings.site_url);
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/escorts`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/agencias`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/arriendos`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/quienes-somos`, lastModified: new Date("2026-09-14T00:00:00-03:00"), changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/faq`, lastModified: new Date("2026-09-13T00:00:00-03:00"), changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contacto`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/noticias`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/novedades`, changeFrequency: "weekly", priority: 0.65 },
    ...(settings.sponsors_enabled === "enabled" ? [{ url: `${siteUrl}/patrocinadores`, changeFrequency: "monthly" as const, priority: 0.5 }] : []),
    { url: `${siteUrl}/terminos`, lastModified: new Date("2026-09-13T00:00:00-03:00"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacidad`, lastModified: new Date("2026-09-13T00:00:00-03:00"), changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/reglas-de-publicacion`, changeFrequency: "yearly", priority: 0.3 },
    ...cityDirectory.map((city) => ({ url: `${siteUrl}/escorts/${city.citySlug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...profiles.map((profile) => ({ url: `${siteUrl}${profilePublicPath(profile)}`, lastModified: new Date(profile.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...Array.from(new Map(news.map((post) => [newsCanonicalUrl(post.slug, post.canonicalUrl), post])).entries()).map(([url, post]) => {
      const updatedAt = newsIsoDate(post.updatedAt);
      return { url, ...(updatedAt ? { lastModified: new Date(updatedAt) } : {}), changeFrequency: "monthly" as const, priority: 0.6 };
    }),
  ];
}
