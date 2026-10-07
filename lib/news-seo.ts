const siteUrl = "https://chile3x.cl";

export function newsCanonicalUrl(slug: string, canonical: string | null = null) {
  if (canonical) {
    try {
      const url = new URL(canonical);
      if (url.protocol === "https:" && url.hostname === "chile3x.cl" && url.pathname.startsWith("/noticias/")) return url.toString();
    } catch { /* Use the published article's own URL. */ }
  }
  return `${siteUrl}/noticias/${encodeURIComponent(slug)}`;
}

// SQLite timestamps are UTC, although their default representation lacks a zone.
export function newsIsoDate(value: string | null) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

type NewsSeoPost = {
  title: string; slug: string; metaDescription: string | null; excerpt: string;
  canonicalUrl: string | null; publishedAt: string | null; createdAt: string; updatedAt: string;
};

export function newsStructuredData(post: NewsSeoPost, coverId?: string | null) {
  const url = newsCanonicalUrl(post.slug, post.canonicalUrl);
  const publishedAt = newsIsoDate(post.publishedAt ?? post.createdAt);
  const updatedAt = newsIsoDate(post.updatedAt);
  return [
    {
      "@context": "https://schema.org", "@type": "Article", "@id": `${url}#article`,
      headline: post.title, description: post.metaDescription || post.excerpt,
      ...(publishedAt ? { datePublished: publishedAt } : {}),
      ...(updatedAt ? { dateModified: updatedAt } : {}),
      author: { "@type": "Organization", name: "Chile3X", url: `${siteUrl}/quienes-somos` },
      publisher: { "@type": "Organization", name: "Chile3X", url: siteUrl },
      mainEntityOfPage: url, inLanguage: "es-CL",
      ...(coverId ? { image: `${siteUrl}/noticias/media/${encodeURIComponent(coverId)}` } : {}),
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "Noticias", item: `${siteUrl}/noticias` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
}
