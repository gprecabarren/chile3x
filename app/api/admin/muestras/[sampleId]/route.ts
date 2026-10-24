import { and,eq,sql } from "drizzle-orm";
import { getDb } from "@/db";
import { dataDeletionJobs,privateProfileSamples,privateSampleMedia } from "@/db/schema";
import { getCurrentAdmin,assertSameOrigin } from "@/lib/auth";
import { canManageSamples,getPrivateSample,migratePrivateSample,sampleMedia,updatePrivateSample } from "@/lib/private-samples";
import { expectedVersion,guardedBatch,CollaborationConflict,conflictResponse,mutationRedirect } from "@/lib/collaboration";
import { newSampleToken,sampleTokenHash,sampleLink,SAMPLE_LIFETIME_MS } from "@/lib/private-sample-policy";
import { ProfileValidationError } from "@/lib/profile-submission";
import { recordAdminAudit } from "@/lib/admin-audit";
import { detectImageType,detectVideoType,extensionForImageType,extensionForVideoType,getMediaUsage,MEDIA_HARD_LIMIT_BYTES,MAX_IMAGE_BYTES,MAX_VIDEO_BYTES,MAX_PROFILE_MEDIA_BYTES } from "@/lib/media";

export async function POST(request:Request,{params}:{params:Promise<{sampleId:string}>}) {
  try{assertSameOrigin(request);}catch{return new Response("Solicitud no válida.",{status:403});}
  const admin=await getCurrentAdmin();if(!admin||!canManageSamples(admin))return new Response("No autorizado.",{status:403});
  const {sampleId}=await params,row=await getPrivateSample(sampleId);if(!row)return new Response("No disponible.",{status:404});
  try {
    const form=await request.formData(),version=expectedVersion(form,`sample:${sampleId}`),intent=String(form.get("sample_action")??"save"),db=await getDb();
    if(row.revision!==version.revision)throw new CollaborationConflict();
    if(row.migratedAt&&intent!=="delete")throw new ProfileValidationError("Esta muestra ya se convirtió en un anuncio real.");
    let destination=`/admin/muestras/${sampleId}`;
    if(intent==="save")await updatePrivateSample(sampleId,form,version,admin);
    else if(intent==="share") {
      const token=newSampleToken(),expiresAt=Date.now()+SAMPLE_LIFETIME_MS;
      await guardedBatch(version,[db.update(privateProfileSamples).set({tokenHash:await sampleTokenHash(token),expiresAt,updatedAt:new Date().toISOString()}).where(eq(privateProfileSamples.id,sampleId))],admin.id);
      await recordAdminAudit(admin,{category:"profiles",action:"sample.share",entityType:"sample",entityId:sampleId,summary:"Renovó el enlace privado de una muestra; el anterior quedó invalidado."});
      // Acknowledge OUR commit, not a later version written by another admin.
      return Response.json({url:new URL(sampleLink(sampleId,token),request.url).href,expiresAt,revision:version.revision+1},{headers:{"cache-control":"private, no-store","referrer-policy":"no-referrer"}});
    } else if(intent==="revoke")await guardedBatch(version,[db.update(privateProfileSamples).set({tokenHash:null,updatedAt:new Date().toISOString()}).where(eq(privateProfileSamples.id,sampleId))],admin.id);
    else if(intent==="migrate") {
      if(form.get("acceptance")!=="on")throw new ProfileValidationError("Confirma la aceptación de la anunciante y la titularidad de la cuenta destino.");
      const id=await migratePrivateSample(row,String(form.get("owner_email")??""),version,admin);destination=`/admin/anuncios-publicaciones/${id}/editar`;
    } else if(intent==="delete") {
      if(form.get("confirmation")!=="ELIMINAR")throw new ProfileValidationError("Escribe ELIMINAR para borrar la muestra y sus fotos.");
      await guardedBatch(version,[db.insert(dataDeletionJobs).select(db.select({id:sql<string>`lower(hex(randomblob(16)))`.as("id"),r2Key:privateSampleMedia.r2Key,createdAt:sql<string>`CURRENT_TIMESTAMP`.as("created_at")}).from(privateSampleMedia).where(eq(privateSampleMedia.sampleId,sampleId))),db.delete(privateProfileSamples).where(eq(privateProfileSamples.id,sampleId))],admin.id);destination="/admin/muestras";
    } else if(intent==="upload") {
      const file=form.get("file"),cover=form.get("cover")==="on";
      if(!(file instanceof File)||!file.size||file.size>MAX_VIDEO_BYTES)throw new ProfileValidationError("Selecciona una foto (máx. 10 MB) o video (máx. 12 MB).");
      const signature=await file.slice(0,16).arrayBuffer(),image=detectImageType(signature),video=image?null:detectVideoType(signature);
      if(!image&&!video||cover&&!image||image&&file.size>MAX_IMAGE_BYTES)throw new ProfileValidationError("Archivo no compatible: fotos JPG, PNG o WebP; videos MP4 o WebM.");
      if(video){
        const {validatePreparedVideo}=await import("@/lib/video-validation");
        try{await validatePreparedVideo(await file.arrayBuffer(),video);}catch(error){throw new ProfileValidationError(error instanceof Error?error.message:"El video no es compatible.");}
      }
      const files=await sampleMedia(sampleId),kind=image?"image":"video";
      if(files.filter(f=>f.mediaType===kind).length>=(image?10:3)||files.reduce((n,f)=>n+f.byteSize,0)+file.size>MAX_PROFILE_MEDIA_BYTES)throw new ProfileValidationError("Límite: 10 fotos, 3 videos y 45 MB por muestra. Elimina un archivo antes de continuar.");
      if((await getMediaUsage()).bytes+file.size>MEDIA_HARD_LIMIT_BYTES)throw new ProfileValidationError("No hay espacio disponible dentro del margen configurado.");
      const {env}=await import("cloudflare:workers");if(!env.MEDIA)throw new Error("storage");
      const id=`smp_${crypto.randomUUID()}`,r2Key=`private-samples/${sampleId}/${id}.${image?extensionForImageType(image):extensionForVideoType(video!)}`;
      await env.MEDIA.put(r2Key,file.stream(),{httpMetadata:{contentType:image??video!,cacheControl:"private, no-store"}});
      try{await guardedBatch(version,[db.update(privateProfileSamples).set({updatedAt:new Date().toISOString()}).where(eq(privateProfileSamples.id,sampleId)),...(cover?[db.update(privateSampleMedia).set({isProfilePhoto:false}).where(eq(privateSampleMedia.sampleId,sampleId))]:[]),db.insert(privateSampleMedia).values({id,sampleId,r2Key,byteSize:file.size,contentType:image??video!,mediaType:kind,isProfilePhoto:cover||Boolean(image&&!files.some(f=>f.isProfilePhoto)),sortOrder:files.reduce((m,f)=>Math.max(m,f.sortOrder),-1)+1})],admin.id);}
      catch(error){
        // A timeout is not proof of rollback. Never remove a successfully
        // committed upload (or one already transferred to a real profile).
        try {
          const reference=await db.get<{inUse:number}>(sql`select exists(select 1 from private_sample_media where r2_key=${r2Key}) or exists(select 1 from profile_media where r2_key=${r2Key}) as inUse`);
          if(reference?.inUse===0)await env.MEDIA.delete(r2Key);
        }catch{console.warn("sample_upload_cleanup_deferred");}
        throw error;
      }
    } else if(intent==="remove_media"||intent==="cover") {
      const id=String(form.get("media_id")??""),file=(await sampleMedia(sampleId)).find(f=>f.id===id);if(!file)throw new ProfileValidationError("Archivo no disponible.");
      if(intent==="cover") {
        if(file.mediaType!=="image")throw new ProfileValidationError("Elige una imagen como foto principal.");
        await guardedBatch(version,[db.update(privateSampleMedia).set({isProfilePhoto:false}).where(eq(privateSampleMedia.sampleId,sampleId)),db.update(privateSampleMedia).set({isProfilePhoto:true}).where(and(eq(privateSampleMedia.id,id),eq(privateSampleMedia.sampleId,sampleId))),db.update(privateProfileSamples).set({updatedAt:new Date().toISOString()}).where(eq(privateProfileSamples.id,sampleId))],admin.id);
      }else await guardedBatch(version,[db.insert(dataDeletionJobs).select(db.select({id:sql<string>`lower(hex(randomblob(16)))`.as("id"),r2Key:privateSampleMedia.r2Key,createdAt:sql<string>`CURRENT_TIMESTAMP`.as("created_at")}).from(privateSampleMedia).where(and(eq(privateSampleMedia.id,id),eq(privateSampleMedia.sampleId,sampleId)))),db.delete(privateSampleMedia).where(and(eq(privateSampleMedia.id,id),eq(privateSampleMedia.sampleId,sampleId)))],admin.id);
    } else throw new ProfileValidationError("Acción no válida.");
    await recordAdminAudit(admin,{category:"profiles",action:`sample.${intent}`,entityType:"sample",entityId:sampleId,summary:`Administró una muestra privada: ${intent}.`});
    if(intent==="upload"&&request.headers.get("accept")?.includes("application/json"))return Response.json({revision:version.revision+2},{headers:{"cache-control":"private, no-store"}});
    return mutationRedirect(request,new URL(destination,request.url));
  }catch(error){
    if(error instanceof CollaborationConflict)return conflictResponse();
    const conflict=String(error).includes("escort_profile_owner_conflict")||String(error).includes("UNIQUE constraint");
    return Response.json({error:error instanceof ProfileValidationError?error.message:conflict?"La cuenta ya tiene un anuncio Escort o el @ fue ocupado. Revisa la cuenta antes de repetirlo.":"No se pudo confirmar la acción. Revisa la versión actual antes de repetirla."},{status:conflict?409:error instanceof ProfileValidationError?400:500,headers:{"cache-control":"private, no-store"}});
  }
}
