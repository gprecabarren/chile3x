import type { Metadata } from "next";

// A stable, branded fallback for every public page that does not have its own
// approved cover. Keep this to the official Chile3X logo only: link previews
// must never substitute the brand for generic artwork.
export const socialCardImageUrl = "/chile3x-logo-dark.jpeg?v=3";

export const socialCardImage = {
  url: socialCardImageUrl,
  width: 1025,
  height: 576,
  alt: "Chile3X, directorio nacional de escorts en Chile",
};

type PublicPageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  socialTitle?: string;
  socialDescription?: string;
};

type PrivatePageMetadataOptions = {
  title: string;
  description: string;
  path: string;
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

/** Metadata for account and authentication routes that must never be indexed. */
export function privatePageMetadata({ title, description, path }: PrivatePageMetadataOptions): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true },
    },
  };
}
