import { redirect } from "next/navigation";
import { AdminPageHeading, AdminShell } from "../_components";
import { HelpCenter } from "@/app/help/HelpCenter";
import { getCurrentAdmin } from "@/lib/auth";
import { ADMIN_CAPABILITY_LABELS, adminHasCapability, type AdminCapability } from "@/lib/admin-permissions";
import { getStoredHelpTopics } from "@/lib/help-guides";
import Link from "next/link";
import { publicWhatsappContacts } from "@/lib/portal-whatsapp";
import { getSiteSettings } from "@/lib/site-settings";
import { privatePageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Ayuda administrativa beta", description: "Guías de administración según los permisos del usuario.", path: "/admin/ayuda" });

export default async function AdminHelpPage({ searchParams }: { searchParams: Promise<{audience?: string}> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/ayuda");
  const settings = await getSiteSettings();
  const capabilities = (Object.keys(ADMIN_CAPABILITY_LABELS) as AdminCapability[]).filter(capability => adminHasCapability(admin, capability));
  const audience = (await searchParams).audience === "account" ? "account" : "admin";
  const topics = await getStoredHelpTopics(audience, { capabilities });
  return <AdminShell user={admin}><div className="admin-content"><AdminPageHeading eyebrow="ADMINISTRACIÓN · AYUDA" title="Centro de ayuda" description="Encuentra instrucciones de los flujos administrativos habilitados para tu función. La ayuda beta no concede permisos ni ejecuta acciones." backHref="/admin" />
    <nav className="help-audience-switch" aria-label="Vista previa de ayuda"><Link aria-current={audience==='admin'?'page':undefined} href="/admin/ayuda">Ayuda administrativa</Link><Link aria-current={audience==='account'?'page':undefined} href="/admin/ayuda?audience=account">Ayuda de usuarios</Link>{adminHasCapability(admin,"settings.manage")&&<><Link href="/admin/ayuda/guias">Administrar guías</Link><Link href="/admin/configuracion/ayuda">Activar o desactivar para usuarios</Link></>}</nav>
    {audience==='account'&&<p className="help-preview-note">Vista previa de las guías de usuarios. No inicia otra sesión ni concede acceso a datos de sus cuentas. {settings.account_help_enabled !== 'enabled' ? 'La sección está desactivada para usuarios.' : ''}</p>}
    <HelpCenter key={audience} audience={audience} topics={topics} contacts={publicWhatsappContacts(settings)} />
  </div></AdminShell>;
}
