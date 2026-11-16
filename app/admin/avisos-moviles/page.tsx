import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { MobilePushSettings } from "@/app/MobilePushSettings";
import { AdminPageHeading, AdminShell } from "../_components";
import "../../mobile-push-settings.css";

export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/avisos-moviles");
  if (!adminHasCapability(admin, "audit.view")) redirect("/admin/acceso-denegado?reason=permission");
  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="ADMINISTRACIÓN" title="Notificaciones móviles" description="Instala la aplicación y elige los avisos que quieres recibir en este dispositivo." backHref="/admin" />
    <MobilePushSettings admin />
  </div></AdminShell>;
}
