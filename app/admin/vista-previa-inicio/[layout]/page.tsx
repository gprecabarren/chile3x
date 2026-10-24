import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { homeLayoutLabels, isHomeLayout } from "@/lib/home-layout-policy";
import { privatePageMetadata } from "@/lib/seo";
import { HomeContent } from "@/app/HomeContent";
import { ActionAnchor } from "@/app/ActionButton";
import { HOME_TESTING_PATH } from "@/lib/admin-testing-policy";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Vista previa privada del home", description: "Previsualización administrativa. No modifica el diseño público.", path: "/admin/testing" });

export default async function HomePreviewPage({ params }: { params: Promise<{ layout: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin");
  if (!adminHasCapability(admin, "settings.manage")) redirect("/admin/acceso-denegado?reason=permission");
  const { layout } = await params;
  if (!isHomeLayout(layout)) notFound();
  return <><aside className="home-preview-toolbar" aria-label="Vista previa privada"><div><strong>VISTA PREVIA · {homeLayoutLabels[layout]}</strong><small>Solo para administradores autorizados. No cambia la versión pública ni activa este diseño.</small></div><ActionAnchor href={HOME_TESTING_PATH}>Volver a los diseños</ActionAnchor></aside><HomeContent layout={layout} preview /></>;
}
