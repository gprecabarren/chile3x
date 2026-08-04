import type { MetadataRoute } from "next";
import { cityDirectory } from "@/app/locations";
import { getPublicProfiles } from "@/lib/directory";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { listNews } from "@/lib/news";
import { profilePublicPath } from "@/lib/profile";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [profiles, settings, news] = await Promise.all([getPublicProfiles(), getSiteSettings(), listNews()]);
  const siteUrl = siteBaseUrl(settings.site_url);
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/escorts`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/agencias`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/arriendos`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/quienes-somos`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contacto`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/noticias`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/terminos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/privacidad`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/reglas-de-publicacion`, changeFrequency: "yearly", priority: 0.3 },
    ...cityDirectory.map((city) => ({ url: `${siteUrl}/escorts/${city.citySlug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...profiles.filter((profile) => !profile.isDemo).map((profile) => ({ url: `${siteUrl}${profilePublicPath(profile)}`, lastModified: new Date(profile.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...news.map(({ post }) => ({ url: `${siteUrl}/noticias/${post.slug}`, lastModified: new Date(post.updatedAt), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
