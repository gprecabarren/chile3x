import type { Metadata } from "next";

// A stable, branded fallback for every public page that does not have its own
// approved cover. The version prevents social platforms from reusing the old,
// generic preview image cached under the prior URL.
export const socialCardImageUrl = "/chile3x-logo-primary.jpeg?v=2";

export const socialCardImage = {
  url: socialCardImageUrl,
  width: 1067,
  height: 600,
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
