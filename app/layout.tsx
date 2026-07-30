import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AgeGate } from "./AgeGate";
import { MaintenanceScreen } from "./MaintenanceScreen";
import { getCurrentAdmin } from "@/lib/auth";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";

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
    type: "website",
    locale: "es_CL",
    images: [
      {
        url: "/chile3x-social-card.png",
        width: 1734,
        height: 907,
        alt: "Chile3X — directorio para adultos en Chile",
      },
    ],
  },
    twitter: {
      card: "summary_large_image",
      title: settings.site_title,
      description: settings.site_description,
      images: ["/chile3x-social-card.png"],
    },
    icons: { icon: "/chile3x-logo-primary.jpeg" },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, admin] = await Promise.all([getSiteSettings(), getCurrentAdmin()]);
  const maintenanceEnabled = settings.maintenance_mode === "enabled";
  const analyticsId = /^G-[A-Z0-9]{6,15}$/.test(settings.google_analytics_id) ? settings.google_analytics_id : null;

  return (
    <html lang="es">
      <body>
        {analyticsId && <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${analyticsId}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments)} gtag('js', new Date()); gtag('config', '${analyticsId}');`}</Script>
        </>}
        {!maintenanceEnabled || admin ? children : <MaintenanceScreen />}
        <AgeGate />
      </body>
    </html>
  );
}
