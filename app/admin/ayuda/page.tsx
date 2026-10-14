import { redirect } from "next/navigation";
import { AdminPageHeading, AdminShell } from "../_components";
import { HelpCenter } from "@/app/help/HelpCenter";
import { getCurrentAdmin } from "@/lib/auth";
import { ADMIN_CAPABILITY_LABELS, adminHasCapability, type AdminCapability } from "@/lib/admin-permissions";
import { getHelpTopics } from "@/lib/help-knowledge";
import { publicWhatsappContacts } from "@/lib/portal-whatsapp";
import { getSiteSettings } from "@/lib/site-settings";
import { privatePageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Ayuda administrativa beta", description: "Guías de administración según los permisos del usuario.", path: "/admin/ayuda" });

export default async function AdminHelpPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/ayuda");
  const settings = await getSiteSettings();
  const capabilities = (Object.keys(ADMIN_CAPABILITY_LABELS) as AdminCapability[]).filter(capability => adminHasCapability(admin, capability));
  return <AdminShell user={admin}><div className="admin-content"><AdminPageHeading eyebrow="ADMINISTRACIÓN · AYUDA" title="Centro de ayuda" description="Encuentra instrucciones de los flujos administrativos habilitados para tu función. La ayuda beta no concede permisos ni ejecuta acciones." backHref="/admin" />
    <HelpCenter audience="admin" topics={getHelpTopics("admin", { capabilities })} contacts={publicWhatsappContacts(settings)} />
  </div></AdminShell>;
}
