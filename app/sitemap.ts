import type { MetadataRoute } from "next";
import { cityDirectory } from "@/app/locations";
import { getPublicProfiles } from "@/lib/directory";

export const dynamic = "force-dynamic";

const siteUrl = "https://chile3x.chile3x-cl.workers.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await getPublicProfiles();
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/escorts`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/agencias`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/arriendos`, changeFrequency: "weekly", priority: 0.7 },
    ...cityDirectory.map((city) => ({ url: `${siteUrl}/escorts/${city.citySlug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...profiles.map((profile) => ({ url: `${siteUrl}/perfil/${profile.slug}`, lastModified: new Date(profile.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
