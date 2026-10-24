import { redirect } from "next/navigation";
import Link from "@/app/NavigationLink";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { HOME_TESTING_PATH, THEME_TESTING_PATH, readTestingSection, testingBugReportsPath } from "@/lib/admin-testing-policy";
import { privatePageMetadata } from "@/lib/seo";
import { AdminPageHeading, AdminShell } from "../_components";
import { BugReportsPanel } from "./BugReportsPanel";
import { HomeLayoutSettingsPanel } from "./HomeLayoutSettingsPanel";
import { VisualThemeSettingsPanel } from "./VisualThemeSettingsPanel";
import "./testing.css";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Testing", description: "Reportes de errores y pruebas privadas del sitio.", path: "/admin/testing" });

type TestingQuery = { seccion?: string; estado?: string; notice?: string; saved?: string };

export default async function AdminTestingPage({ searchParams }: { searchParams: Promise<TestingQuery> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/testing");
  const permissions = { bugs: adminHasCapability(admin, "bugs.manage"), settings: adminHasCapability(admin, "settings.manage") };
  const query = await searchParams;
  const section = readTestingSection(query.seccion, permissions);
  if (!section) redirect("/admin/acceso-denegado?reason=permission");

  return <AdminShell user={admin}><div className="admin-content admin-testing">
    <AdminPageHeading eyebrow="CONTROL DE CALIDAD" title="Testing" description="Reportes de errores, diseños del home y tema visual, en un solo lugar. Cada herramienta conserva sus permisos." backHref="/admin" />
    <nav className="admin-testing-tabs" aria-label="Herramientas de Testing">
      {permissions.bugs && <Link href={testingBugReportsPath()} prefetch={false} aria-current={section === "bugs" ? "page" : undefined}>Reportes de errores</Link>}
      {permissions.settings && <Link href={HOME_TESTING_PATH} prefetch={false} aria-current={section === "inicio" ? "page" : undefined}>Diseños del home</Link>}
      {permissions.settings && <Link href={THEME_TESTING_PATH} prefetch={false} aria-current={section === "tema" ? "page" : undefined}>Tema visual</Link>}
    </nav>
    {section === "bugs" ? <BugReportsPanel estado={query.estado} notice={query.notice} /> : section === "inicio" ? <HomeLayoutSettingsPanel saved={query.saved} /> : <VisualThemeSettingsPanel saved={query.saved} />}
  </div></AdminShell>;
}
