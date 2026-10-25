import { chileanDay } from "@/lib/chile-day";
import {notFound,redirect} from "next/navigation";
import {getCurrentAdmin} from "@/lib/auth";
import {canManageSamples,getPrivateSample,sampleInitial,sampleMedia} from "@/lib/private-samples";
import {SAMPLE_PROVENANCE_LABELS,SAMPLE_STATUS_LABELS,sampleListStatus} from "@/lib/private-sample-policy";
import {adminAuditDate,adminAuditInstant} from "@/lib/admin-audit-date";
import {getMediaQuotaState,getMediaUsage} from "@/lib/media";
import {privatePageMetadata} from "@/lib/seo";
import {ProfileForm} from "@/app/mi-cuenta/ProfileForm";
import {ReviewScope} from "@/app/admin/ReviewScope";
import {SampleActions} from "../SampleActions";
import {SampleMediaManager} from "../SampleMediaManager";
import {AdminShell,AdminPageHeading} from "../../_components";
export const dynamic="force-dynamic";
export const metadata=privatePageMetadata({title:"Administrar muestra privada",description:"Datos, medios y presentación privada de una muestra, sin publicación en el directorio.",path:"/admin/muestras"});
export default async function Page({params}:{params:Promise<{sampleId:string}>}) {
  const admin=await getCurrentAdmin();if(!admin)redirect("/api/auth/github/start?return_to=/admin/muestras");if(!canManageSamples(admin))redirect("/admin/acceso-denegado?reason=permission");
  const {sampleId}=await params,row=await getPrivateSample(sampleId);if(!row)notFound();
  const status=sampleListStatus({...row,shared:Boolean(row.tokenHash)}),trashed=status==="trashed";
  if(row.migratedAt&&!trashed)redirect(row.migratedProfileId?`/admin/anuncios-publicaciones/${row.migratedProfileId}/editar`:"/admin/muestras");
  const [files,usage]=trashed?[[],{bytes:0}]:await Promise.all([sampleMedia(sampleId),getMediaUsage()]);
  return <AdminShell user={admin}><div className="admin-content samples-admin-content"><ReviewScope resource={`sample:${sampleId}`} revision={row.revision}>
    <AdminPageHeading eyebrow={trashed?"MUESTRA EN PAPELERA":"MUESTRA PRIVADA · NO PUBLICADA"} title={row.displayName} description={trashed?"Esta muestra no puede compartirse ni editarse mientras esté en la papelera. Puedes restaurarla o eliminarla definitivamente.":"Revisa sus datos, prepara las fotos y comparte la presentación. Los cambios se protegen frente a ediciones simultáneas del equipo."} backHref={trashed?"/admin/muestras?view=trash":"/admin/muestras"}/>
    <section className="sample-admin-card sample-summary-card"><header className="sample-row-heading"><h2>Datos de la muestra</h2><span className={`sample-status is-${status}`}>{SAMPLE_STATUS_LABELS[status]}</span></header><dl className="sample-row-metadata">
      <div><dt>Usuario de la muestra</dt><dd>{row.handle?`@${row.handle}`:"Sin usuario asignado"}</dd></div>
      <div><dt>Procedencia</dt><dd>{SAMPLE_PROVENANCE_LABELS[row.provenance]}</dd></div>
      <div><dt>Creación</dt><dd><time dateTime={adminAuditInstant(row.createdAt)}>{adminAuditDate(row.createdAt)}</time></dd></div>
      <div><dt>{trashed?"En papelera desde":"Vence"}</dt><dd>{adminAuditDate(new Date(trashed?(row.trashedAt??row.expiresAt):row.expiresAt).toISOString())}</dd></div>
    </dl></section>
    <SampleActions id={sampleId} revision={row.revision} handle={row.handle} shared={Boolean(row.tokenHash)} expiresAt={row.expiresAt} trashed={trashed} legacyLink={Boolean(row.tokenHash&&!row.tokenEncrypted)} provenance={row.provenance}/>
    {!trashed&&<><SampleMediaManager id={sampleId} revision={row.revision} files={files.map(({id,byteSize,contentType,mediaType,isProfilePhoto})=>({id,byteSize,contentType,mediaType,isProfilePhoto}))} initialQuota={{bytes:usage.bytes,...getMediaQuotaState(usage.bytes)}}/>
    <details className="sample-admin-card sample-editor-card"><summary><span><strong>Editar datos de la muestra</strong><small>Nombre, usuario, procedencia, ciudad y características del anuncio.</small></span></summary><div className="sample-editor-content"><ProfileForm travelToday={chileanDay()} action={`/api/admin/muestras/${sampleId}`} submitLabel="Guardar cambios de la muestra" initial={sampleInitial(row)} sampleProvenance={row.provenance} privateSample adminEdit review={{key:`sample:${sampleId}`,revision:row.revision}}/></div></details></>}
  </ReviewScope></div></AdminShell>;
}
