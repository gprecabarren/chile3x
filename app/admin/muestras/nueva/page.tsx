import {redirect} from "next/navigation";
import {getCurrentAdmin} from "@/lib/auth";
import {canManageSamples} from "@/lib/private-samples";
import {ProfileForm} from "@/app/mi-cuenta/ProfileForm";
import {AdminShell,AdminPageHeading} from "../../_components";
export default async function Page() {
  const admin=await getCurrentAdmin();if(!admin)redirect("/api/auth/github/start?return_to=/admin/muestras/nueva");if(!canManageSamples(admin))redirect("/admin/acceso-denegado?reason=permission");
  return <AdminShell user={admin}><div className="admin-content"><AdminPageHeading eyebrow="SOLO ADMINISTRACIÓN" title="Crear muestra privada" description="Los mismos campos de un Escort, sin crear usuario ni publicar en el directorio. Las fotos se añaden después de guardar." backHref="/admin/muestras"/><ProfileForm action="/api/admin/muestras" submitLabel="Guardar muestra privada" privateSample adminEdit/></div></AdminShell>;
}
