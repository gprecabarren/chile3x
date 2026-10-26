import { eq,sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminAuditLogs,collaborationGuards,dataDeletionJobs,privateProfileSamples,privateSampleMedia } from "@/db/schema";
import { getCurrentAdmin,assertSameOrigin } from "@/lib/auth";
import { canManageSamples,getPrivateSample,migratePrivateSample,updatePrivateSample,SampleEscortLimitConflict } from "@/lib/private-samples";
import { expectedVersion,guardedBatch,CollaborationConflict,conflictResponse,mutationRedirect } from "@/lib/collaboration";
import { newSampleToken,sampleTokenHash,sampleLink,sampleCanEdit,SAMPLE_LIFETIME_MS,SAMPLE_TOKEN } from "@/lib/private-sample-policy";
import { encryptPrivateSampleToken,decryptPrivateSampleToken } from "@/lib/private-sample-links";
import { ProfileValidationError } from "@/lib/profile-submission";
import { type AdminAuditAction } from "@/lib/admin-audit";

const headers={"cache-control":"private, no-store","referrer-policy":"no-referrer","x-robots-tag":"noindex, nofollow, noarchive"};
function listReturn(value:FormDataEntryValue|null,notice:string) {
  let url:URL;try{url=new URL(typeof value==="string"?value:"/admin/muestras","https://chile3x.invalid");}catch{url=new URL("/admin/muestras","https://chile3x.invalid");}
  if(url.origin!=="https://chile3x.invalid"||url.pathname!=="/admin/muestras")url=new URL("/admin/muestras","https://chile3x.invalid");
  url.searchParams.set("notice",notice);return `${url.pathname}${url.search}`;
}
export async function POST(request:Request,{params}:{params:Promise<{sampleId:string}>}) {
  try{assertSameOrigin(request);}catch{return new Response("Solicitud no válida.",{status:403,headers});}
  const admin=await getCurrentAdmin();if(!admin||!canManageSamples(admin))return new Response("No autorizado.",{status:403,headers});
  const {sampleId}=await params,row=await getPrivateSample(sampleId);if(!row)return new Response("No disponible.",{status:404,headers});
  try {
    const form=await request.formData(),version=expectedVersion(form,`sample:${sampleId}`),intent=String(form.get("sample_action")??"save"),db=await getDb();
    if(row.revision!==version.revision)throw new CollaborationConflict();
    const now=new Date().toISOString(),editable=sampleCanEdit(row),trashed=row.trashedAt!==null||(!row.migratedAt&&row.expiresAt<=Date.now());
    const audit=(action:AdminAuditAction,summary:string,after?:Record<string,unknown>)=>db.insert(adminAuditLogs).values({id:`audit_${crypto.randomUUID()}`,actorUserId:admin.id,actorGithubLogin:admin.githubLogin,actorEmail:admin.email,actorName:admin.displayName,category:"profiles",action,outcome:"success",entityType:"sample",entityId:sampleId,entityLabel:row.displayName,summary,afterData:after?JSON.stringify(after):null});
    const commit=async(values:Partial<typeof privateProfileSamples.$inferInsert>,action:AdminAuditAction,summary:string,after?:Record<string,unknown>)=>{
      const guard=crypto.randomUUID();
      await guardedBatch(version,[
        db.insert(collaborationGuards).values({id:guard,allowed:sql`case when ${["share","adopt_link","revoke","extend","contact_mark","contact_clear"].includes(intent)?sql`exists(select 1 from private_profile_samples where id=${sampleId} and migrated_at is null and trashed_at is null and expires_at>${Date.now()})`:sql`1`} then 1 else 0 end`}),
        db.update(privateProfileSamples).set({...values,updatedAt:now}).where(eq(privateProfileSamples.id,sampleId)),audit(action,summary,after),db.delete(collaborationGuards).where(eq(collaborationGuards.id,guard))
      ],admin.id);
    };
    const replyLink=async(token:string,revision=row.revision)=>Response.json({url:new URL(sampleLink(row.handle??sampleId,token),request.url).href,expiresAt:row.expiresAt,revision},{headers});
    if(["save","share","get_link","adopt_link","revoke","extend","migrate","contact_mark","contact_clear"].includes(intent)&&!editable)throw new ProfileValidationError("Esta muestra ya venció, está en papelera o fue convertida. Revisa su estado antes de continuar.");
    if(intent==="get_link")return row.tokenEncrypted?replyLink(await decryptPrivateSampleToken(row.tokenEncrypted,sampleId)):Response.json({legacyLink:Boolean(row.tokenHash),expiresAt:row.expiresAt,revision:row.revision},{headers});
    let destination=`/admin/muestras/${sampleId}`;
    if(intent==="save") {
      await updatePrivateSample(sampleId,form,version,admin);
    } else if(intent==="share") {
      if(row.tokenEncrypted&&row.tokenHash)return replyLink(await decryptPrivateSampleToken(row.tokenEncrypted,sampleId));
      const token=newSampleToken();
      const tokenEncrypted=await encryptPrivateSampleToken(token,sampleId);
      await commit({tokenHash:await sampleTokenHash(token),tokenEncrypted,legacyTokenHash:row.legacyTokenHash??row.tokenHash},"sample.share","Guardó un enlace privado recuperable; los enlaces vigentes anteriores conservan su acceso.");
      return replyLink(token,version.revision+1);
    } else if(intent==="adopt_link") {
      let previous:URL;try{previous=new URL(String(form.get("previous_link")??""));}catch{throw new ProfileValidationError("Pega el enlace privado completo, incluido su código después de #.");}
      const token=previous.hash.slice(1),hash=SAMPLE_TOKEN.test(token)?await sampleTokenHash(token):null;
      if(![new URL(request.url).origin,"https://chile3x.cl"].includes(previous.origin)||![`/muestra/${sampleId}`,`/muestra/${row.handle}`].includes(previous.pathname)||!hash||hash!==row.tokenHash)throw new ProfileValidationError("Ese enlace no corresponde al acceso vigente de esta muestra.");
      await commit({tokenEncrypted:await encryptPrivateSampleToken(token,sampleId)},"sample.adopt_link","Guardó el enlace vigente para recuperarlo sin cambiar su acceso ni vencimiento.");
      return replyLink(token,version.revision+1);
    } else if(intent==="revoke") {
      await commit({tokenHash:null,legacyTokenHash:null,tokenEncrypted:null},"sample.revoke","Revocó todos los enlaces y accesos de la muestra.");
    } else if(intent==="extend") {
      await commit({expiresAt:Date.now()+SAMPLE_LIFETIME_MS},"sample.extend","Extendió la muestra por 7 días, conservando el enlace.");
    } else if(intent==="contact_mark"||intent==="contact_clear") {
      const contacted=intent==="contact_mark";
      await commit({contactedAt:contacted?now:null,contactedBy:contacted?admin.id:null,contactedByLogin:contacted?admin.githubLogin:null},contacted?"sample.contact_mark":"sample.contact_clear",contacted?"Marcó al posible anunciante como contactado.":"Retiró la marca de contacto del posible anunciante.",{contacted,contactedAt:contacted?now:null});
      destination=listReturn(form.get("return_to"),contacted?"contact_marked":"contact_cleared");
    } else if(intent==="trash") {
      if(trashed)throw new ProfileValidationError("La muestra ya está en papelera.");
      await commit({trashedAt:Date.now(),trashedBy:admin.id,trashReason:"manual"},"sample.trash","Envió la muestra a la papelera y suspendió sus accesos.");
      destination=listReturn(form.get("return_to"),"trashed");
    } else if(intent==="restore") {
      if(!trashed)throw new ProfileValidationError("La muestra no está en papelera.");
      await commit({trashedAt:null,trashedBy:null,trashReason:null,...(!row.migratedAt?{expiresAt:Date.now()+SAMPLE_LIFETIME_MS}:{})},"sample.restore","Restauró la muestra; su enlace anterior vuelve a estar disponible durante 7 días si no fue revocado.");
      destination=listReturn(form.get("return_to"),"restored");
    } else if(intent==="migrate") {
      if(form.get("acceptance")!=="on")throw new ProfileValidationError("Confirma la aceptación del anunciante y la titularidad de la cuenta destino.");
      const allowAdditionalEscort=form.get("allow_additional_escort")==="on";
      const parseCount=(key:string)=>/^\d{1,12}$/.test(String(form.get(key)??""))?Number(form.get(key)):undefined;
      const id=await migratePrivateSample(row,String(form.get("owner_email")??""),version,admin,{allowAdditionalEscort,expectedOwnerId:String(form.get("expected_owner_id")??""),expectedOwnerRevision:parseCount("expected_owner_revision"),expectedEscortCount:parseCount("expected_escort_count")});
      destination=`/admin/anuncios-publicaciones/${id}/editar`;
    } else if(intent==="delete") {
      if(!trashed)throw new ProfileValidationError("Envía primero la muestra a la papelera.");
      if(form.get("confirmation")!=="ELIMINAR")throw new ProfileValidationError("Escribe ELIMINAR para borrar la muestra y sus fotos.");
      await guardedBatch(version,[db.insert(dataDeletionJobs).select(db.select({id:sql<string>`lower(hex(randomblob(16)))`.as("id"),r2Key:privateSampleMedia.r2Key,createdAt:sql<string>`CURRENT_TIMESTAMP`.as("created_at")}).from(privateSampleMedia).where(sql`${privateSampleMedia.sampleId}=${sampleId} and not exists(select 1 from profile_media p where p.r2_key=${privateSampleMedia.r2Key}) and not exists(select 1 from private_sample_media other where other.r2_key=${privateSampleMedia.r2Key} and other.sample_id!=${sampleId})`)).onConflictDoNothing({target:dataDeletionJobs.r2Key}),audit("sample.delete","Eliminó definitivamente la muestra; los medios transferidos al anuncio se conservan."),db.delete(privateProfileSamples).where(eq(privateProfileSamples.id,sampleId))],admin.id);
      destination=listReturn(form.get("return_to"),"deleted");
    } else throw new ProfileValidationError("Acción no válida.");
    return mutationRedirect(request,new URL(destination,request.url));
  }catch(error){
    if(error instanceof SampleEscortLimitConflict)return Response.json({error:error.message,additionalEscortConfirmation:true,target:error.target},{status:409,headers});
    if(error instanceof CollaborationConflict)return conflictResponse();
    const conflict=String(error).includes("escort_profile_owner_conflict")||String(error).includes("UNIQUE constraint");
    return Response.json({error:error instanceof ProfileValidationError?error.message:conflict?"La cuenta o el usuario del anuncio cambiaron. Revisa la versión actual antes de repetirlo.":"No se pudo confirmar la acción. Revisa la versión actual antes de repetirla."},{status:conflict?409:error instanceof ProfileValidationError?400:500,headers});
  }
}
