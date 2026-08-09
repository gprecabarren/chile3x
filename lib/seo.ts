import type { Metadata } from "next";

// A stable, branded fallback for every public page that does not have its own
// approved cover. It uses the 1200×630 Open Graph format with generous safe
// margins, so social platforms do not crop the Chile3X wordmark.
export const socialCardImageUrl = "/chile3x-social-card-v2.png";

export const socialCardImage = {
  url: socialCardImageUrl,
  width: 1200,
  height: 630,
  alt: "Chile3X, directorio nacional de escorts en Chile",
};

type PublicPageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  socialTitle?: string;
  socialDescription?: string;
};

export function publicPageMetadata({
  title,
  description,
  path,
  socialTitle,
  socialDescription,
}: PublicPageMetadataOptions): Metadata {
  const openGraphTitle = socialTitle ?? `${title} | Chile3X`;
  const openGraphDescription = socialDescription ?? description;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: openGraphTitle,
      description: openGraphDescription,
      url: path,
      locale: "es_CL",
      type: "website",
      siteName: "Chile3X",
      images: [socialCardImage],
    },
    twitter: {
      card: "summary_large_image",
      title: openGraphTitle,
      description: openGraphDescription,
      images: [socialCardImageUrl],
    },
  };
}
