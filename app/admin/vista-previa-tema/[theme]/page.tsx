import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { getSiteSettings } from "@/lib/site-settings";
import { readHomeLayout } from "@/lib/home-layout-policy";
import { isVisualTheme, visualThemeLabels } from "@/lib/site-theme-policy";
import { privatePageMetadata } from "@/lib/seo";
import { THEME_TESTING_PATH } from "@/lib/admin-testing-policy";
import { HomeContent } from "@/app/HomeContent";
import { ActionAnchor } from "@/app/ActionButton";
import { PreviewDocumentNavigation } from "../PreviewDocumentNavigation";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Vista previa privada del tema", description: "Prueba visual sin modificar la apariencia pública.", path: "/admin/testing" });

export default async function ThemePreviewPage({ params }: { params: Promise<{ theme: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin");
  if (!adminHasCapability(admin, "settings.manage")) redirect("/admin/acceso-denegado?reason=permission");
  const { theme } = await params;
  if (!isVisualTheme(theme)) notFound();
  const settings = await getSiteSettings();
  return <><aside className="home-preview-toolbar" aria-label="Vista previa privada"><div><strong>VISTA PREVIA · {visualThemeLabels[theme]}</strong><small>Incluye botones y selectores reales del home. Solo tú ves esta prueba; no activa el tema público. Al salir se usa el tema activo.</small></div><ActionAnchor href={THEME_TESTING_PATH}>Volver a Testing</ActionAnchor></aside><PreviewDocumentNavigation><HomeContent layout={readHomeLayout(settings.home_layout)} preview /></PreviewDocumentNavigation></>;
}
