import { NextRequest,NextResponse } from "next/server";
import { assertSameOrigin,getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { recordAdminAudit } from "@/lib/admin-audit";
import { readMediaUploadForm,MediaUploadRequestError } from "@/lib/media-upload-form";
import { detectImageType,detectVideoType,extensionForImageType,extensionForVideoType,getMediaUsage,MEDIA_HARD_LIMIT_BYTES } from "@/lib/media";
import { validatePreparedVideo } from "@/lib/video-validation";
import { MAX_PREPARED_VIDEO_BYTES } from "@/lib/video-policy";
import { acceptForumRules } from "@/lib/forum-community";
import { claimForumRate,FORUM_ATTACHMENTS_PER_POST,FORUM_ATTACHMENT_BYTES,FORUM_IMAGE_BYTES } from "@/lib/forum-community-policy";
import { ForumInputError } from "@/lib/forum-policy";
const headers={'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow'};
const error=(message:string,status=400)=>NextResponse.json({error:message},{status,headers});
export async function POST(request:NextRequest,{params}:{params:Promise<{postId:string}>}){
 try{
  try{assertSameOrigin(request);}catch{return error('Solicitud no válida.',403);}
  const admin=await getCurrentAdmin();if(!admin)return error('Inicie sesión como administrador.',401);if(!adminHasCapability(admin,'forum.manage'))return error('No tiene permiso para acceder al foro privado.',403);
  const {env}=await import('cloudflare:workers');const {postId}=await params;
  const post=await env.DB.prepare("SELECT p.id FROM forum_posts p JOIN forum_topics t ON t.id=p.topic_id JOIN forum_sections s ON s.id=t.section_id WHERE p.id=? AND p.trashed_at IS NULL AND t.trashed_at IS NULL AND t.is_locked=0 AND s.is_archived=0").bind(postId).first();if(!post)return error('El mensaje no está disponible para adjuntar archivos.',409);
  await claimForumRate(env.DB,admin.id,'upload');
  const form=await readMediaUploadForm(request,MAX_PREPARED_VIDEO_BYTES);if(form.get('consent')!=='yes')return error('Confirme que cuenta con los derechos y el consentimiento de las personas adultas representadas. No se admiten documentos privados.');
  const version=await acceptForumRules(env.DB,admin,form),entry=form.get('file');if(!(entry instanceof File)||!entry.size)return error('El archivo llegó vacío o no fue seleccionado. Descargue el original en su dispositivo e inténtelo nuevamente.');
  const bytes=await entry.arrayBuffer(),image=detectImageType(bytes),video=image?null:detectVideoType(bytes);if(!image&&!video)return error('El formato real del archivo no es compatible. Solo se admiten JPEG, PNG, WebP, MP4 o WebM preparados. No PDF, SVG ni documentos.');
  if(image&&bytes.byteLength>FORUM_IMAGE_BYTES)return error('La foto preparada supera los 5 MB del foro.',413);if(video)try{await validatePreparedVideo(bytes,video);}catch(cause){return error(cause instanceof Error?cause.message:'No se pudo validar el video; vuelva a prepararlo.');}
  if((await getMediaUsage()).bytes+bytes.byteLength>MEDIA_HARD_LIMIT_BYTES)return error('La carga está pausada para proteger la cuota de almacenamiento del sitio.',503);
  if(!env.MEDIA)return error('El almacenamiento no está disponible. Intente más tarde.',503);
  const type=image?'image':'video',contentType=image??video!,id=`fatt_${crypto.randomUUID()}`,key=`forum/${postId}/${id}.${image?extensionForImageType(image):extensionForVideoType(video!)}`,now=new Date().toISOString();
  const reserved=await env.DB.prepare("INSERT INTO forum_attachments(id,post_id,uploaded_by,media_type,r2_key,byte_size,content_type,consent_version,created_at,updated_at) SELECT ?,p.id,?,?,?,?,?,?,?,? FROM forum_posts p JOIN forum_topics t ON t.id=p.topic_id JOIN forum_sections s ON s.id=t.section_id WHERE p.id=? AND p.trashed_at IS NULL AND t.trashed_at IS NULL AND t.is_locked=0 AND s.is_archived=0 AND EXISTS(SELECT 1 FROM forum_settings WHERE id='global' AND version=?) AND (SELECT count(*) FROM forum_attachments a WHERE a.post_id=p.id AND a.deleted_at IS NULL)<? AND (SELECT coalesce(sum(byte_size),0) FROM forum_attachments)+?<=?").bind(id,admin.id,type,key,bytes.byteLength,contentType,version,now,now,postId,version,FORUM_ATTACHMENTS_PER_POST,bytes.byteLength,FORUM_ATTACHMENT_BYTES).run();
  if(!reserved.meta.changes){
   const state=await env.DB.prepare("SELECT p.trashed_at AS post_trash,t.trashed_at AS topic_trash,t.is_locked,s.is_archived,(SELECT version FROM forum_settings WHERE id='global') AS version,(SELECT count(*) FROM forum_attachments a WHERE a.post_id=p.id AND a.deleted_at IS NULL) AS slots,(SELECT coalesce(sum(byte_size),0) FROM forum_attachments) AS bytes FROM forum_posts p JOIN forum_topics t ON t.id=p.topic_id JOIN forum_sections s ON s.id=t.section_id WHERE p.id=?").bind(postId).first<{post_trash:string|null;topic_trash:string|null;is_locked:number;is_archived:number;version:string;slots:number;bytes:number}>();
   if(!state||state.post_trash||state.topic_trash||state.is_locked||state.is_archived)return error('El mensaje, tema o sección dejó de admitir adjuntos durante la carga. No se guardó el archivo.',409);
   if(state.version!==version)return error('Las normas cambiaron durante la carga. Recargue y confírmelas; no se guardó el archivo.',409);
   if(state.slots>=FORUM_ATTACHMENTS_PER_POST)return error('Este mensaje ya tiene cuatro adjuntos. Retire uno antes de añadir otro; no se guardó el archivo.',409);
   if(state.bytes+bytes.byteLength>FORUM_ATTACHMENT_BYTES)return error('Se alcanzó el cupo global de 200 MB del foro beta, incluidos los archivos en recuperación. No se guardó el archivo.',409);
   return error('El estado cambió durante la carga. Recargue y compruebe los adjuntos antes de repetir; no se guardó el archivo.',409);
  }
  try{await env.MEDIA.put(key,bytes,{httpMetadata:{contentType,cacheControl:'private, no-store',contentDisposition:'inline'},customMetadata:{category:'forum',postId,visibility:'private'}});}
  catch{await env.DB.batch([env.DB.prepare('INSERT OR IGNORE INTO data_deletion_jobs(id,r2_key) VALUES(?,?)').bind(crypto.randomUUID(),key),env.DB.prepare('DELETE FROM forum_attachments WHERE id=? AND r2_key=?').bind(id,key)]);return error('El almacenamiento no pudo guardar el archivo. Se retiró su registro y cualquier fragmento se limpiará automáticamente. Intente más tarde.',503);}
  await recordAdminAudit(admin,{category:'forum',action:'forum.attachment_upload',entityType:'forum_post',entityId:postId,summary:'Subió un adjunto privado a revisión del foro.',metadata:{attachmentId:id,mediaType:type,bytes:bytes.byteLength,consentVersion:version}});
  return NextResponse.json({id,moderationStatus:'pending',message:'Archivo guardado en revisión. No se aprobó automáticamente.'},{status:201,headers});
 }catch(cause){if(cause instanceof ForumInputError||cause instanceof MediaUploadRequestError)return error(cause.message,cause.status);const reference=crypto.randomUUID().slice(0,8);console.error(JSON.stringify({event:'forum.upload.failure',reference}));return error(`No se pudo confirmar la carga. Revise los adjuntos antes de repetirla para evitar duplicados. Referencia: ${reference}.`,500);}
}
