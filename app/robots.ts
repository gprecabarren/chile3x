import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/mi-cuenta", "/api/"] },
    sitemap: "https://chile3x.chile3x-cl.workers.dev/sitemap.xml",
  };
}
