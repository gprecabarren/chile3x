import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./corner-tokens.css";
import "./panel-foundations.css";
import "./action-controls.css";
import "./footer-access.css";
import "./account-form-controls.css";
import "./admin-record-layout.css";
import "./modern-controls.css";
import "./public-controls.css";
import "./public-reading.css";
import "./public-desktop.css";
import "./public-mobile.css";
import { PRIVATE_SAMPLE_HEADER } from "@/lib/private-sample-policy";
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
import { GLASS_STYLESHEET, readVisualTheme, VISUAL_THEME_HEADER } from "@/lib/site-theme-policy";

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
      title: settings.social_title||settings.site_title,
      description: settings.social_description||settings.site_description,
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
      title: settings.social_title||settings.site_title,
      description: settings.social_description||settings.site_description,
      images: [socialCardImageUrl],
    },
    icons: {
      icon: [
        { url: "/chile3x-favicon-48-20261020.png", type: "image/png", sizes: "48x48" },
        { url: "/chile3x-favicon-192-20261020.png", type: "image/png", sizes: "192x192" },
        { url: "/chile3x-favicon-512-20261020.png", type: "image/png", sizes: "512x512" },
        { url: "/chile3x-favicon-20261020.ico", type: "image/x-icon", sizes: "any" },
      ],
      shortcut: "/chile3x-favicon-20261020.ico",
      apple: [{ url: "/chile3x-apple-touch-20261020.png", type: "image/png", sizes: "180x180" }],
    },
    manifest: "/site.webmanifest?v=20261020",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const maintenanceEnabled = settings.maintenance_mode === "enabled";
  const requestHeaders=await headers();
  const theme = readVisualTheme(requestHeaders.get(VISUAL_THEME_HEADER) ?? settings.visual_theme);
  if(requestHeaders.get(PRIVATE_SAMPLE_HEADER)==="1")return <html lang="es" data-visual-theme={theme}><head><meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex"/><meta name="referrer" content="no-referrer"/><link rel="preload" href="/fonts/dm-sans-latin-variable-20261023.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/>{theme==="liquid-glass"&&<link rel="stylesheet" href={GLASS_STYLESHEET} precedence="visual-theme" data-theme-stylesheet="liquid-glass"/>}</head><body>{children}<AgeGate/></body></html>;
  // Anonymous views require no session DB lookup. Signed-in identity checks
  // are deduplicated with the header and protected route within this render.
  const [admin, user, sessionView] = await Promise.all([maintenanceEnabled ? getCurrentAdmin() : Promise.resolve(null), getVerificationUser(), getBrowserSessionView()]);
  const verificationDeadline = user && ["grace", "blocked"].includes(emailVerificationState(user)) ? emailVerificationDeadline(user) : null;

  return (
    <html lang="es" data-visual-theme={theme}>
      <head>
        <link rel="preload" href="/fonts/dm-sans-latin-variable-20261023.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <meta name="rating" content="adult" />
        {theme === "liquid-glass" && <link rel="stylesheet" href={GLASS_STYLESHEET} precedence="visual-theme" data-theme-stylesheet="liquid-glass" />}
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
