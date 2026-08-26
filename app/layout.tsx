import type { Metadata } from "next";
import "./globals.css";
import { AgeGate } from "./AgeGate";
import { MaintenanceScreen } from "./MaintenanceScreen";
import { PrivacyConsent } from "./PrivacyConsent";
import { getCurrentAdmin } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { BugReporter } from "./BugReporter";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { socialCardImage, socialCardImageUrl } from "@/lib/seo";
import Script from "next/script";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const indexingEnabled = settings.robots_indexing === "enabled";
  const siteUrl = siteBaseUrl(settings.site_url);

  return {
    metadataBase: new URL(siteUrl),
    alternates: { canonical: "/" },
    title: { default: settings.site_title, template: `%s | Chile3X` },
    description: settings.site_description,
    robots: indexingEnabled ? { index: true, follow: true } : { index: false, follow: false },
    verification: settings.google_site_verification ? { google: settings.google_site_verification } : undefined,
    openGraph: {
      title: settings.site_title,
      description: settings.site_description,
      url: "/",
      type: "website",
      locale: "es_CL",
      siteName: "Chile3X",
    images: [
      {
        url: socialCardImageUrl,
        width: socialCardImage.width,
        height: socialCardImage.height,
        alt: "Chile3X, directorio para adultos en Chile",
      },
    ],
  },
    twitter: {
      card: "summary_large_image",
      title: settings.site_title,
      description: settings.site_description,
      images: [socialCardImageUrl],
    },
    icons: {
      icon: [
        { url: "/favicon-512.png", type: "image/png", sizes: "512x512" },
        { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      shortcut: "/favicon.ico",
      apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
    },
    manifest: "/site.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, admin, user] = await Promise.all([getSiteSettings(), getCurrentAdmin(), getCurrentUser()]);
  const maintenanceEnabled = settings.maintenance_mode === "enabled";

  return (
    <html lang="es">
      <head>
        <meta name="rating" content="adult" />
        <Script id="google-preferred-source-bootstrap" strategy="beforeInteractive">
          {`window.PREFERRED_SOURCE = window.PREFERRED_SOURCE || [];
window.PREFERRED_SOURCE.push(function(preferredSource) {
  window.__chile3xPreferredSource = preferredSource;
  preferredSource.init({ theme: "dark", lang: "es-419" });
});`}
        </Script>
        <Script
          id="google-preferred-source-library"
          src="https://news.google.com/swg/js/v1/publisher.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        {!maintenanceEnabled || admin ? children : <MaintenanceScreen />}
        <AgeGate />
        <PrivacyConsent />
        {user?.role === "tester" && <BugReporter />}
      </body>
    </html>
  );
}
