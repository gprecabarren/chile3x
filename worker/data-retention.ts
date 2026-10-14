import { RETENTION_DAYS, RETENTION_ENFORCE_AT } from "../lib/data-retention-policy";

type RetentionEnv = {DB:Pick<D1Database,"prepare"|"batch">;MEDIA?:Pick<R2Bucket,"delete">};
const held=(type:string,column:string)=>`EXISTS (SELECT 1 FROM data_retention_holds WHERE entity_type='${type}' AND entity_id=${column})`;
export async function purgeRetainedData(env:RetentionEnv, now=new Date().toISOString()) {
  if(Date.parse(now)<Date.parse(RETENTION_ENFORCE_AT))return {removed:0,retryNeeded:false,rollout:true};
  let removed=0;const retryNeeded=false;
  // Claim DB deletion and durable file jobs atomically. No stale read can erase
  // a replacement, reopened report or pre-existing legal hold. R2 retries do
  // not require retaining publicly/privately accessible content records.
  const documents=await env.DB.prepare(`SELECT id,r2_key FROM profile_verification_files WHERE retention_expires_at IS NOT NULL AND datetime(retention_expires_at)<=datetime(?) AND NOT ${held('verification','profile_verification_files.id')} ORDER BY retention_expires_at LIMIT 50`).bind(now).all<{id:string;r2_key:string}>();
  for(const row of documents.results){
    const condition=`id=? AND r2_key=? AND datetime(retention_expires_at)<=datetime(?) AND NOT ${held('verification','profile_verification_files.id')}`;
    const result=await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO data_deletion_jobs(id,r2_key) SELECT ?,r2_key FROM profile_verification_files WHERE ${condition}`).bind(crypto.randomUUID(),row.id,row.r2_key,now),
      env.DB.prepare(`DELETE FROM profile_verification_files WHERE ${condition}`).bind(row.id,row.r2_key,now),
    ]);removed+=result[1].meta.changes??0;
  }
  const reports=await env.DB.prepare(`SELECT id,updated_at FROM profile_reports WHERE status IN ('resolved','dismissed') AND datetime(updated_at)<=datetime(?,'-${RETENTION_DAYS.closedReport} days') AND NOT ${held('report','profile_reports.id')} ORDER BY updated_at LIMIT 20`).bind(now).all<{id:string;updated_at:string}>();
  for(const report of reports.results){
    const condition=`id=? AND updated_at=? AND status IN ('resolved','dismissed') AND NOT ${held('report','profile_reports.id')}`;
    const result=await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO data_deletion_jobs(id,r2_key) SELECT lower(hex(randomblob(16))),r2_key FROM profile_report_evidence WHERE report_id IN (SELECT id FROM profile_reports WHERE ${condition})`).bind(report.id,report.updated_at),
      env.DB.prepare(`DELETE FROM profile_reports WHERE ${condition}`).bind(report.id,report.updated_at),
    ]);removed+=result[1].meta.changes??0;
  }
  const statements = [
    [`forum_notifications`,`datetime(created_at)<=datetime(?,'-90 days')`],
    [`forum_reports`,`status IN ('resolved','dismissed') AND datetime(resolved_at)<=datetime(?,'-180 days') AND NOT ${held('forum_report','forum_reports.id')}`],
    [`auth_sessions`,`datetime(expires_at)<=datetime(?,'-${RETENTION_DAYS.expiredSession} days')`],
    [`account_tokens`,`datetime(expires_at)<=datetime(?,'-7 days')`],
    [`auth_session_completions`,`datetime(expires_at)<=datetime(?)`],
    [`apple_auth_attempts`,`datetime(expires_at)<=datetime(?)`],
    [`apple_registration_intents`,`datetime(expires_at)<=datetime(?)`],
    [`google_registration_intents`,`datetime(expires_at)<=datetime(?)`],
    [`x_auth_attempts`,`datetime(expires_at)<=datetime(?)`],
    [`x_registration_intents`,`datetime(expires_at)<=datetime(?)`],
    [`operational_events`,`datetime(created_at)<=datetime(?,'-${RETENTION_DAYS.operational} days')`],
    [`account_deletion_history`,`datetime(deleted_at)<=datetime(?,'-${RETENTION_DAYS.deletionHistory} days') AND NOT ${held('deletion','account_deletion_history.id')}`],
    [`admin_audit_logs`,`datetime(created_at)<=datetime(?,'-${RETENTION_DAYS.audit} days') AND NOT ${held('audit','admin_audit_logs.id')}`],
    [`message_conversations`,`datetime(last_message_at)<=datetime(?,'-${RETENTION_DAYS.conversation} days') AND NOT ${held('conversation','message_conversations.id')}`],
  ].map(([table,condition])=>env.DB.prepare(`DELETE FROM ${table} WHERE id IN (SELECT id FROM ${table} WHERE ${condition} LIMIT 200)`).bind(now));
  for(const result of await env.DB.batch(statements))removed+=result.meta.changes??0;
  await env.DB.prepare("DELETE FROM forum_rate_limits WHERE key IN (SELECT key FROM forum_rate_limits WHERE datetime(updated_at)<=datetime(?,'-1 day') LIMIT 200)").bind(now).run();
  const retired=`(datetime(deleted_at)<=datetime(?,'-30 days') OR (moderation_status='rejected' AND datetime(reviewed_at)<=datetime(?,'-30 days')) OR EXISTS(SELECT 1 FROM forum_posts p JOIN forum_topics t ON t.id=p.topic_id WHERE p.id=forum_attachments.post_id AND (datetime(p.trashed_at)<=datetime(?,'-30 days') OR datetime(t.trashed_at)<=datetime(?,'-30 days')))) AND NOT ${held('forum_attachment','forum_attachments.id')}`;
  const files=await env.DB.prepare(`SELECT id,r2_key FROM forum_attachments WHERE ${retired} LIMIT 50`).bind(now,now,now,now).all<{id:string;r2_key:string}>();
  for(const file of files.results){const condition=`id=? AND r2_key=? AND ${retired}`;const result=await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO data_deletion_jobs(id,r2_key) SELECT ?,r2_key FROM forum_attachments WHERE ${condition}`).bind(crypto.randomUUID(),file.id,file.r2_key,now,now,now,now),
    env.DB.prepare(`DELETE FROM forum_attachments WHERE ${condition}`).bind(file.id,file.r2_key,now,now,now,now),
  ]);removed+=result[1].meta.changes??0;}
  return {removed,retryNeeded,rollout:false};
}
export async function purgeMediaDeletionJobs(env:RetentionEnv) {
  let retryNeeded=false;
  const jobs=await env.DB.prepare("SELECT id,r2_key FROM data_deletion_jobs ORDER BY created_at LIMIT 100").all<{id:string;r2_key:string}>();
  if(jobs.results.length) {
    if(!env.MEDIA)retryNeeded=true;
    else try{await env.MEDIA.delete(jobs.results.map(job=>job.r2_key));await env.DB.batch(jobs.results.map(job=>env.DB.prepare("DELETE FROM data_deletion_jobs WHERE id=? AND r2_key=?").bind(job.id,job.r2_key)));}catch{retryNeeded=true;}
  }
  return {processed:retryNeeded?0:jobs.results.length,retryNeeded};
}
export async function handleDataRetentionScheduled(env:RetentionEnv) {
  const now=new Date().toISOString();if(Date.parse(now)<Date.parse(RETENTION_ENFORCE_AT))return;
  // Claim one run per hour; errors re-enable a retry at the next five-minute tick.
  await env.DB.prepare("INSERT OR IGNORE INTO site_settings(key,value,updated_at) VALUES('retention_last_run','',?)").bind(now).run();
  const claim=await env.DB.prepare("UPDATE site_settings SET value=?,updated_at=? WHERE key='retention_last_run' AND (value='' OR datetime(value)<=datetime(?,'-1 hour'))").bind(now,now,now).run();
  if(!claim.meta.changes)return;
  try{const result=await purgeRetainedData(env,now);if(result.retryNeeded)throw new Error('retry');}
  catch{await env.DB.prepare("UPDATE site_settings SET value='' WHERE key='retention_last_run' AND value=?").bind(now).run();console.error(JSON.stringify({event:'retention.retry_required',detail:'La limpieza restringida se reintentará; no se registran contenidos ni claves de archivos.'}));}
}
