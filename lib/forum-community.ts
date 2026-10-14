import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { forumAttachments,forumNotifications,forumPosts,forumReports,forumSettings,forumTopics,forumWatches } from "@/db/schema";
import type { AdminUser } from "@/lib/auth";
import type { AdminAuditInput } from "@/lib/admin-audit";
import { forumText,ForumInputError,FORUM_PAGE_SIZE } from "./forum-policy";
import { FORUM_DEFAULT_RULES,forumReportReason } from "./forum-community-policy";

export async function getForumRules(){const [row]=await (await getDb()).select().from(forumSettings).where(eq(forumSettings.id,'global')).limit(1);return row??{id:'global',rules:FORUM_DEFAULT_RULES,version:'2026.10.14.1',updatedAt:'2026-10-14T00:00:00Z',updatedBy:null};}
export async function acceptForumRules(db:D1Database,admin:AdminUser,form:FormData){
 const rules=await getForumRules();if(form.get('rules_version')!==rules.version||form.get('rules_ack')!=='yes')throw new ForumInputError("Lea y confirme las normas actuales del foro antes de publicar. Recargue si su versión cambió.",428);
 const result=await db.prepare("INSERT OR IGNORE INTO forum_rule_acceptances(id,user_id,version) SELECT ?,?,version FROM forum_settings WHERE id='global' AND version=?").bind(crypto.randomUUID(),admin.id,rules.version).run();
 if(!result.meta.changes){const exists=await db.prepare("SELECT id FROM forum_rule_acceptances WHERE user_id=? AND version=? AND EXISTS(SELECT 1 FROM forum_settings WHERE id='global' AND version=?)").bind(admin.id,rules.version,rules.version).first();if(!exists)throw new ForumInputError("Las normas cambiaron durante el envío. Recargue y revíselas.",409);}
 return rules.version;
}
export async function notifyForumReply(db:D1Database,topicId:string,postId:string,actorId:string){
 await db.prepare("INSERT OR IGNORE INTO forum_notifications(id,recipient_id,topic_id,post_id) SELECT lower(hex(randomblob(16))),w.user_id,w.topic_id,? FROM forum_watches w JOIN users u ON u.id=w.user_id WHERE w.topic_id=? AND w.user_id<>? AND u.role='admin' AND u.is_active=1 AND EXISTS(SELECT 1 FROM admin_github_access a WHERE a.user_id=u.id AND a.is_active=1 AND a.access_level IN ('owner','administrator')) AND EXISTS(SELECT 1 FROM forum_posts p WHERE p.id=? AND p.topic_id=w.topic_id AND p.trashed_at IS NULL)").bind(postId,topicId,actorId,postId).run();
}
export async function getForumAttachments(postIds:string[]){return postIds.length?(await getDb()).select().from(forumAttachments).where(inArray(forumAttachments.postId,postIds)).orderBy(asc(forumAttachments.createdAt)).limit(80):[];}
export async function getForumWatch(topicId:string,userId:string){const [row]=await (await getDb()).select({id:forumWatches.id}).from(forumWatches).where(and(eq(forumWatches.topicId,topicId),eq(forumWatches.userId,userId))).limit(1);return Boolean(row);}
export async function getForumNotifications(userId:string,page:number){const db=await getDb();return db.select({id:forumNotifications.id,title:forumTopics.title,topicId:forumTopics.id,postId:forumNotifications.postId,readAt:forumNotifications.readAt,createdAt:forumNotifications.createdAt}).from(forumNotifications).innerJoin(forumTopics,eq(forumTopics.id,forumNotifications.topicId)).where(and(eq(forumNotifications.recipientId,userId),isNull(forumTopics.trashedAt))).orderBy(desc(forumNotifications.createdAt),desc(forumNotifications.id)).limit(FORUM_PAGE_SIZE+1).offset((page-1)*FORUM_PAGE_SIZE);}
export async function getForumReviewQueue(closed=false,page=1){const db=await getDb();const [reports,attachments]=await Promise.all([
 db.select({report:forumReports,post:forumPosts,title:forumTopics.title}).from(forumReports).innerJoin(forumPosts,eq(forumPosts.id,forumReports.postId)).innerJoin(forumTopics,eq(forumTopics.id,forumPosts.topicId)).where(closed?sql`${forumReports.status}<>'open'`:eq(forumReports.status,'open')).orderBy(desc(forumReports.createdAt)).limit(FORUM_PAGE_SIZE+1).offset((page-1)*FORUM_PAGE_SIZE),
 db.select({file:forumAttachments,topicId:forumPosts.topicId,title:forumTopics.title}).from(forumAttachments).innerJoin(forumPosts,eq(forumPosts.id,forumAttachments.postId)).innerJoin(forumTopics,eq(forumTopics.id,forumPosts.topicId)).where(and(eq(forumAttachments.moderationStatus,'pending'),isNull(forumAttachments.deletedAt),isNull(forumPosts.trashedAt),isNull(forumTopics.trashedAt))).orderBy(asc(forumAttachments.createdAt)).limit(FORUM_PAGE_SIZE+1).offset((page-1)*FORUM_PAGE_SIZE),
 ]);return {reports,attachments};}

export async function applyForumCommunityAction(form:FormData,action:string,admin:AdminUser):Promise<{path:string;audit:AdminAuditInput}|null>{
 if(!['rules_update','watch_update','notifications_read','report_create','report_resolve','attachment_review','attachment_remove','attachment_restore'].includes(action))return null;
 const {env}=await import('cloudflare:workers');const db=await getDb(),now=new Date().toISOString();const id=()=>forumText(form,'id',80);
 let path='/foro',audit:AdminAuditInput;
 if(action==='rules_update'){
  const version=forumText(form,'version',40),rules=forumText(form,'reglas',8000),nextVersion=crypto.randomUUID();
  const result=await db.update(forumSettings).set({rules,version:nextVersion,updatedBy:admin.id,updatedAt:now}).where(and(eq(forumSettings.id,'global'),eq(forumSettings.version,version))).returning({id:forumSettings.id});
  if(!result.length)throw new ForumInputError('Las normas cambiaron en otra pestaña. Recargue antes de guardar.',409);
  path='/foro/normas';audit={category:'forum',action:'forum.rules_update',entityType:'settings',entityId:'forum_rules',summary:'Actualizó las normas versionadas del foro privado.',metadata:{previousVersion:version,version:nextVersion}};
 }else if(action==='watch_update'){
  const topicId=id();const enabled=form.get('enabled')==='yes';
  if(enabled){const result=await env.DB.prepare("INSERT OR IGNORE INTO forum_watches(id,topic_id,user_id) SELECT ?,id,? FROM forum_topics WHERE id=? AND trashed_at IS NULL AND (SELECT count(*) FROM forum_watches WHERE user_id=?)<200").bind(crypto.randomUUID(),admin.id,topicId,admin.id).run();if(!result.meta.changes){const old=await env.DB.prepare('SELECT id FROM forum_watches WHERE topic_id=? AND user_id=?').bind(topicId,admin.id).first();if(!old)throw new ForumInputError('El tema no está disponible o se alcanzaron 200 temas seguidos.',409);}}
  else await db.delete(forumWatches).where(and(eq(forumWatches.topicId,topicId),eq(forumWatches.userId,admin.id)));
  path=`/foro/tema/${topicId}`;audit={category:'forum',action:'forum.watch_update',entityType:'forum_topic',entityId:topicId,summary:enabled?'Activó seguimiento interno de un tema.':'Desactivó seguimiento interno de un tema.'};
 }else if(action==='notifications_read'){
  const notificationId=forumText(form,'id',80,false);await db.update(forumNotifications).set({readAt:now}).where(and(eq(forumNotifications.recipientId,admin.id),notificationId?eq(forumNotifications.id,notificationId):undefined));
  path='/foro/notificaciones';audit={category:'forum',action:'forum.notifications_read',entityType:'account',entityId:admin.id,summary:'Marcó notificaciones propias del foro como leídas.'};
 }else if(action==='report_create'){
  const postId=id(),reason=forumReportReason(form.get('motivo')),detail=forumText(form,'detalle',1000),version=forumText(form,'version',32);
  const result=await env.DB.prepare("INSERT OR IGNORE INTO forum_reports(id,post_id,reporter_id,reason,detail,post_version) SELECT ?,p.id,?,?,?,? FROM forum_posts p JOIN forum_topics t ON t.id=p.topic_id WHERE p.id=? AND p.updated_at=? AND p.trashed_at IS NULL AND t.trashed_at IS NULL").bind(crypto.randomUUID(),admin.id,reason,detail,version,postId,version).run();
  if(!result.meta.changes)throw new ForumInputError('Ya presentó una denuncia sobre este mensaje, o el mensaje cambió. Recargue y consulte Moderación.',409);
  path='/foro/moderacion';audit={category:'forum',action:'forum.report_create',entityType:'forum_post',entityId:postId,summary:'Presentó una denuncia privada en el foro.',metadata:{reason}};
 }else if(action==='report_resolve'){
  const reportId=id(),resolution=forumText(form,'resolucion',1000),status=forumText(form,'estado',20);
  if(!['resolved','dismissed'].includes(status))throw new ForumInputError('Seleccione una decisión válida.');
  const [report]=await db.select().from(forumReports).where(eq(forumReports.id,reportId)).limit(1);if(!report)throw new ForumInputError('La denuncia no existe.',404);
  const postVersion=forumText(form,'post_version',32),hide=form.get('retirar')==='yes',decisionToken=crypto.randomUUID();
  const results=await env.DB.batch([
   env.DB.prepare("UPDATE forum_reports SET status=?,resolution=?,resolved_by=?,resolved_at=?,decision_token=? WHERE id=? AND status='open' AND EXISTS(SELECT 1 FROM forum_posts WHERE id=forum_reports.post_id AND updated_at=?)").bind(status,resolution,admin.id,now,decisionToken,reportId,postVersion),
   env.DB.prepare("UPDATE forum_posts SET trashed_at=coalesce(trashed_at,?),updated_at=? WHERE id=? AND ?=1 AND EXISTS(SELECT 1 FROM forum_reports r WHERE r.id=? AND r.decision_token=?)").bind(now,now,report.postId,Number(hide),reportId,decisionToken),
  ]);if(!results[0].meta.changes)throw new ForumInputError('La denuncia fue atendida o el mensaje cambió. Revise nuevamente el contenido.',409);
  path='/foro/moderacion';audit={category:'forum',action:'forum.report_resolve',entityType:'forum_post',entityId:report.postId,summary:'Registró una decisión sobre una denuncia del foro.',metadata:{reportId,status,hidden:hide}};
 }else{
  const fileId=id(),version=forumText(form,'version',32);const [file]=await db.select({file:forumAttachments,topicId:forumPosts.topicId}).from(forumAttachments).innerJoin(forumPosts,eq(forumPosts.id,forumAttachments.postId)).where(eq(forumAttachments.id,fileId)).limit(1);if(!file)throw new ForumInputError('El adjunto ya no existe.',404);
  if(action==='attachment_review'){
   const status=forumText(form,'estado',20);if(!['approved','rejected'].includes(status))throw new ForumInputError('Seleccione aprobar o rechazar.');
   const result=await env.DB.prepare("UPDATE forum_attachments SET moderation_status=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=? AND updated_at=? AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM forum_posts p JOIN forum_topics t ON t.id=p.topic_id WHERE p.id=forum_attachments.post_id AND p.trashed_at IS NULL AND t.trashed_at IS NULL)").bind(status,admin.id,now,now,fileId,version).run();if(!result.meta.changes)throw new ForumInputError('El adjunto cambió o su mensaje fue retirado. Recargue.',409);
  }else{
   const restoring=action==='attachment_restore';const changed=await db.update(forumAttachments).set({deletedAt:restoring?null:now,updatedAt:now,...(restoring?{moderationStatus:'pending' as const,reviewedAt:null,reviewedBy:null}:{})}).where(and(eq(forumAttachments.id,fileId),eq(forumAttachments.updatedAt,version),restoring?sql`${forumAttachments.deletedAt} IS NOT NULL AND (SELECT count(*) FROM forum_attachments a WHERE a.post_id=${file.file.postId} AND a.deleted_at IS NULL)<4`:undefined)).returning({id:forumAttachments.id});if(!changed.length)throw new ForumInputError('El adjunto cambió o el mensaje ya tiene cuatro adjuntos. Recargue antes de modificarlo.',409);
  }
  path=`/foro/tema/${file.topicId}`;audit={category:'forum',action:action==='attachment_review'?'forum.attachment_review':action==='attachment_remove'?'forum.attachment_remove':'forum.attachment_restore',entityType:'forum_post',entityId:file.file.postId,summary:action==='attachment_review'?'Revisó un adjunto del foro.':action==='attachment_remove'?'Retiró un adjunto del foro; recuperable durante 30 días.':'Restauró un adjunto del foro para nueva revisión.',metadata:{attachmentId:fileId}};
 }
 return {path,audit};
}
