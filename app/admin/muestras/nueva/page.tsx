import { chileanDay } from "@/lib/chile-day";
import {redirect} from "next/navigation";
import {getCurrentAdmin} from "@/lib/auth";
import {canManageSamples} from "@/lib/private-samples";
import {ProfileForm} from "@/app/mi-cuenta/ProfileForm";
import {privatePageMetadata} from "@/lib/seo";
import {AdminShell,AdminPageHeading} from "../../_components";
export const dynamic="force-dynamic";
export const metadata=privatePageMetadata({title:"Crear muestra privada",description:"Preparación privada de una muestra sin crear cuentas ni anuncios públicos.",path:"/admin/muestras/nueva"});
export default async function Page() {
  const admin=await getCurrentAdmin();if(!admin)redirect("/api/auth/github/start?return_to=/admin/muestras/nueva");if(!canManageSamples(admin))redirect("/admin/acceso-denegado?reason=permission");
  return <AdminShell user={admin}><div className="admin-content samples-admin-content"><AdminPageHeading eyebrow="SOLO ADMINISTRACIÓN" title="Crear muestra privada" description="Los mismos campos de un Escort, sin crear cuenta ni publicar en el directorio. Indica su procedencia y añade las fotos después de guardar." backHref="/admin/muestras"/><ProfileForm travelToday={chileanDay()} action="/api/admin/muestras" submitLabel="Guardar muestra privada" sampleProvenance="otros" privateSample adminEdit/></div></AdminShell>;
}
