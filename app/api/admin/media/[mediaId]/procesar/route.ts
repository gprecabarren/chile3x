import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dataDeletionJobs, profileMedia, profiles } from "@/db/schema";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { findProfileMedia, detectImageType, getMediaUsage, getMediaQuotaState, getProfileMedia, MAX_IMAGE_BYTES, MAX_PROFILE_MEDIA_BYTES, MEDIA_HARD_LIMIT_BYTES } from "@/lib/media";
import { MediaUploadRequestError, readMediaUploadForm } from "@/lib/media-upload-form";
import { CollaborationConflict, expectedVersion, guardedBatch, conflictResponse } from "@/lib/collaboration";
import { parsePhotoEditOptions } from "@/lib/photo-edit-policy";
import { recordAdminAudit } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";
const headers={"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow","x-content-type-options":"nosniff"};
const error=(message:string,status:number)=>Response.json({error:message},{status,headers});

export async function GET(request:Request,{params}:{params:Promise<{mediaId:string}>}) {
  const admin=await getCurrentAdmin();
  if(!admin)return error("Tu sesión administrativa terminó.",401);
  if(!adminHasCapability(admin,"media.moderate"))return error("No tienes permiso para editar estas fotos.",403);
  const {mediaId}=await params,record=await findProfileMedia(mediaId);
  if(!record||record.media.mediaType!=="image"||record.media.visibility!=="public"||record.profile.trashedAt)return error("Foto no disponible.",404);
  const {env}=await import("cloudflare:workers");
  if(!env.MEDIA)return error("Almacenamiento no disponible.",503);
  if(new URL(request.url).searchParams.get("source")==="1"){
    const object=await env.MEDIA.get(record.media.r2Key);
    if(!object)return error("No se encontró la foto actual.",404);
    return new Response(object.body,{headers:{...headers,"content-type":record.media.contentType,"content-length":String(object.size)}});
  }
  const object=await env.MEDIA.head(record.media.r2Key);
  if(!object)return error("No se encontró la foto actual.",404);
  const options=parsePhotoEditOptions(object.customMetadata?.photoOptions);
  const watermark=options?.watermark??object.customMetadata?.watermark==="true",blur=options?.blur??object.customMetadata?.blur==="true";
  return Response.json({id:mediaId,profileId:record.media.profileId,revision:record.profile.revision,watermark,blur,faceRegions:options?.faceRegions??[],hasBase:false,lockedWatermark:watermark,lockedBlur:blur,sourceUrl:`/api/admin/media/${encodeURIComponent(mediaId)}/procesar?source=1`},{headers});
}
export async function POST(request:Request,{params}:{params:Promise<{mediaId:string}>}) {
 try {
  try{assertSameOrigin(request);}catch{return error("Solicitud no válida.",403);}
  const admin=await getCurrentAdmin();
  if(!admin)return error("Tu sesión administrativa terminó.",401);
  if(!adminHasCapability(admin,"media.moderate"))return error("No tienes permiso para editar fotos.",403);
  const {mediaId}=await params,record=await findProfileMedia(mediaId);
  if(!record||record.media.mediaType!=="image"||record.media.visibility!=="public"||record.profile.trashedAt)return error("Foto pública no disponible.",404);
  const form=await readMediaUploadForm(request,MAX_IMAGE_BYTES),options=parsePhotoEditOptions(form.get("options")),file=form.get("file");
  if(!options)return error("Opciones de privacidad no válidas.",400);
  if(!(file instanceof File)||!file.size||file.size>MAX_IMAGE_BYTES)return error("Envía la foto final de hasta 10 MB; no se guardan copias adicionales.",400);
  const contentType=detectImageType(await file.slice(0,16).arrayBuffer());
  if(!contentType)return error("La foto final debe ser JPEG, PNG o WebP válida.",400);
  const version=expectedVersion(form,`profile:${record.media.profileId}`);
  if(version.revision!==record.profile.revision)throw new CollaborationConflict();
  const [usage,allMedia]=await Promise.all([getMediaUsage(),getProfileMedia(record.media.profileId)]);
  if(allMedia.filter(row=>row.visibility==="public").reduce((sum,row)=>sum+row.byteSize,0)-record.media.byteSize+file.size>MAX_PROFILE_MEDIA_BYTES)return error("El anuncio superaría 45 MB.",400);
  const totalBytes=usage.bytes-record.media.byteSize+file.size;
  if(totalBytes>MEDIA_HARD_LIMIT_BYTES)return error("La operación superaría el margen de almacenamiento.",503);
  const {env}=await import("cloudflare:workers");
  if(!env.MEDIA)return error("Almacenamiento no disponible.",503);
  const extension=contentType==="image/png"?"png":contentType==="image/webp"?"webp":"jpg";
  const key=`profiles/${record.media.profileId}/${mediaId}-edit-${crypto.randomUUID()}.${extension}`;
  await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType,cacheControl:"private, no-store"},customMetadata:{profileId:record.media.profileId,processedBy:admin.id,watermark:String(options.watermark),blur:String(options.blur),photoOptions:JSON.stringify(options),mediaType:"image"}});
  const db=await getDb();let revision=record.profile.revision;
  try {
    const result=await guardedBatch(version,[
      db.update(profileMedia).set({r2Key:key,byteSize:file.size,contentType}).where(eq(profileMedia.id,mediaId)),
      db.insert(dataDeletionJobs).values({id:crypto.randomUUID(),r2Key:record.media.r2Key}).onConflictDoNothing(),
      db.select({revision:profiles.revision}).from(profiles).where(eq(profiles.id,record.media.profileId)),
    ],admin.id);
    const rows=result.at(-1);if(Array.isArray(rows)&&typeof rows[0]?.revision==="number")revision=rows[0].revision;
  }catch(cause){try{await env.MEDIA.delete(key);}catch{console.error("Could not remove uncommitted photo",{mediaId});}throw cause;}
  // Replace, do not archive. A durable job retries removal if R2 is unavailable.
  try{await env.MEDIA.delete(record.media.r2Key);await db.delete(dataDeletionJobs).where(eq(dataDeletionJobs.r2Key,record.media.r2Key));}catch{console.error("Photo rendition cleanup deferred",{mediaId});}
  await recordAdminAudit(admin,{category:"media",action:"media.public_process",entityType:"public_media",entityId:mediaId,entityLabel:`Foto · ${record.profile.displayName}`,summary:`Editó una foto de ${record.profile.displayName}.`,after:{profileId:record.media.profileId,watermark:options.watermark,blur:options.blur,additionalOriginalStored:false,moderationStatus:record.media.moderationStatus}});
  return Response.json({ok:true,revision,mediaId,options,quota:{bytes:totalBytes,...getMediaQuotaState(totalBytes)}},{headers});
 }catch(cause){
  if(cause instanceof CollaborationConflict)return conflictResponse();
  if(cause instanceof MediaUploadRequestError)return error(cause.message,cause.status);
  const reference=`FOTO-${crypto.randomUUID().slice(0,8)}`;console.error("Photo edit failed",{reference,cause});
  return error(`No se pudo confirmar la edición. Revisa la foto antes de repetir. Referencia: ${reference}.`,500);
 }
}
