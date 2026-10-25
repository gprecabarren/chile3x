import { chileanDay } from "@/lib/chile-day";
import {notFound,redirect} from "next/navigation";
import {getCurrentAdmin} from "@/lib/auth";
import {canManageSamples,getPrivateSample,sampleInitial,sampleMedia} from "@/lib/private-samples";
import {ProfileForm} from "@/app/mi-cuenta/ProfileForm";
import {ReviewScope} from "@/app/admin/ReviewScope";
import {SampleActions} from "../SampleActions";
import {AdminShell,AdminPageHeading} from "../../_components";
export default async function Page({params}:{params:Promise<{sampleId:string}>}) {
  const admin=await getCurrentAdmin();if(!admin)redirect("/api/auth/github/start?return_to=/admin/muestras");if(!canManageSamples(admin))redirect("/admin/acceso-denegado?reason=permission");
  const {sampleId}=await params,row=await getPrivateSample(sampleId);if(!row)notFound();if(row.migratedAt)redirect(row.migratedProfileId?`/admin/anuncios-publicaciones/${row.migratedProfileId}/editar`:"/admin/muestras");
  const files=await sampleMedia(sampleId);
  return <AdminShell user={admin}><div className="admin-content"><ReviewScope resource={`sample:${sampleId}`} revision={row.revision}><AdminPageHeading eyebrow="MUESTRA PRIVADA · NO PUBLICADA" title={row.displayName} description="Revisa sus datos, prepara las fotos y comparte la presentación. Los cambios se protegen frente a ediciones simultáneas del equipo." backHref="/admin/muestras"/><SampleActions id={sampleId} revision={row.revision} files={files.map(({id,contentType,mediaType,isProfilePhoto})=>({id,contentType,mediaType,isProfilePhoto}))} shared={Boolean(row.tokenHash)}/><details className="sample-admin-card"><summary>Editar datos de la muestra</summary><ProfileForm travelToday={chileanDay()} action={`/api/admin/muestras/${sampleId}`} submitLabel="Guardar cambios de la muestra" initial={sampleInitial(row)} privateSample adminEdit review={{key:`sample:${sampleId}`,revision:row.revision}}/></details></ReviewScope></div></AdminShell>;
}
