import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MobilePushSettings } from "@/app/MobilePushSettings";
import { AccountHeading, AccountShell } from "../_components";
import "../../mobile-push-settings.css";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/avisos-moviles");
  return <AccountShell user={user}><div className="account-content">
    <AccountHeading eyebrow="MI CUENTA" title="Notificaciones móviles" description="Instala la aplicación y activa los avisos que quieres recibir en este dispositivo." backHref="/mi-cuenta" />
    <MobilePushSettings />
  </div></AccountShell>;
}
