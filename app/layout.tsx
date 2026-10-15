import type { Metadata } from "next";
import "./globals.css";
import "./panel-foundations.css";
import { AgeGate } from "./AgeGate";
import { MaintenanceScreen } from "./MaintenanceScreen";
import { getCurrentAdmin, getVerificationUser } from "@/lib/auth";
import { emailVerificationDeadline, emailVerificationState } from "@/lib/email-verification-policy";
import { EmailVerificationDeadline } from "./EmailVerificationNotice";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { socialCardImage, socialCardImageUrl } from "@/lib/seo";
import { DeferredClientFeatures } from "./DeferredClientFeatures";
import { BrowserSessionBoundary } from "./BrowserSessionBoundary";
import { BrowserSessionSetup } from "./BrowserSessionSetup";
import { getBrowserSessionView } from "@/lib/browser-session-view";
import { UserNavigationProgress } from "./UserNavigationProgress";
import { AdminCollaboration } from "./AdminCollaboration";
import { LOAD_RECOVERY_SCRIPT } from "@/lib/load-recovery";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const indexingEnabled = settings.robots_indexing === "enabled";
  const siteUrl = siteBaseUrl(settings.site_url);

  return {
    metadataBase: new URL(siteUrl),
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
        alt: "Chile3X, directorio de escorts y damas de compañía en Chile",
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
        { url: "/favicon-512.png?v=4", type: "image/png", sizes: "512x512" },
        { url: "/favicon-192.png?v=4", type: "image/png", sizes: "192x192" },
        { url: "/favicon-48.png?v=4", type: "image/png", sizes: "48x48" },
        { url: "/favicon.ico?v=4", sizes: "any" },
      ],
      shortcut: "/favicon.ico?v=4",
      apple: [{ url: "/apple-touch-icon.png?v=4", type: "image/png", sizes: "180x180" }],
    },
    manifest: "/site.webmanifest",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const maintenanceEnabled = settings.maintenance_mode === "enabled";
  // Anonymous views require no session DB lookup. Signed-in identity checks
  // are deduplicated with the header and protected route within this render.
  const [admin, user, sessionView] = await Promise.all([maintenanceEnabled ? getCurrentAdmin() : Promise.resolve(null), getVerificationUser(), getBrowserSessionView()]);
  const verificationDeadline = user && ["grace", "blocked"].includes(emailVerificationState(user)) ? emailVerificationDeadline(user) : null;

  return (
    <html lang="es">
      <head>
        <meta name="rating" content="adult" />
        <script id="portal-load-recovery-bootstrap" dangerouslySetInnerHTML={{__html:LOAD_RECOVERY_SCRIPT}} />
      </head>
      <body>
        <BrowserSessionSetup><BrowserSessionBoundary initial={sessionView} key={sessionView.identity ?? "anonymous"}>{!maintenanceEnabled || admin ? children : <MaintenanceScreen />}</BrowserSessionBoundary></BrowserSessionSetup>
        <AgeGate />
        <DeferredClientFeatures />
        <UserNavigationProgress enabled={sessionView.mode !== "admin"} />
        <AdminCollaboration adminMode={sessionView.mode === "admin"} />
        {verificationDeadline !== null && Number.isFinite(verificationDeadline) && <EmailVerificationDeadline deadline={verificationDeadline} />}
      </body>
    </html>
  );
}
