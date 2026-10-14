import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../db/schema.ts';
import { RETENTION_ENFORCE_AT, verificationRetentionExpiresAt } from '../lib/data-retention-policy.ts';
import { newestStories, storyUploadLabel } from '../lib/story-order.ts';

const url=path=>new URL('../'+path,import.meta.url).href;
const stub='data:text/javascript,'+encodeURIComponent('export const getDb=async()=>globalThis.__helpDb;');
async function moduleUrl(path,resolve) {
 let source=await readFile(new URL('../'+path,import.meta.url),'utf8');
 source=source.replace(/from "([^"\n]+)"/g,(_match,name)=>'from '+JSON.stringify(resolve(name)));
 return 'data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64');
}
const retention=await import(await moduleUrl('worker/data-retention.ts',()=>url('lib/data-retention-policy.ts')));
const policyUrl=await moduleUrl('lib/help-guide-policy.ts',()=>url('lib/admin-permissions.ts'));
const policy=await import(policyUrl);
const help=await import(await moduleUrl('lib/help-guides.ts',name=>name==='drizzle-orm'?import.meta.resolve(name):name==='@/db/schema'?url('db/schema.ts'):name==='@/lib/help-guide-policy'?policyUrl:stub));
const account=await import(await moduleUrl('lib/account-data.ts',()=> 'data:text/javascript,export const isValidAccountLocation=()=>true,normalizeAccountCity=x=>x;'));

function binding(db, beforeBatch=()=>{}) {
 const prepare=(sql,values=[])=>({bind:(...args)=>prepare(sql,args),async all(){return {results:db.prepare(sql).all(...values)}},async raw(){const statement=db.prepare(sql);statement.setReturnArrays(true);return statement.all(...values)},async run(){return {meta:{changes:db.prepare(sql).run(...values).changes}}}});
 return {prepare,async batch(statements){beforeBatch();db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}}};
}
function retainedFixture(beforeBatch) {
 const db=new DatabaseSync(':memory:');db.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE profile_verification_files(id TEXT PRIMARY KEY,r2_key TEXT,retention_expires_at TEXT);
 CREATE TABLE data_retention_holds(id TEXT PRIMARY KEY,entity_type TEXT,entity_id TEXT);
 CREATE TABLE data_deletion_jobs(id TEXT PRIMARY KEY,r2_key TEXT UNIQUE,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE profile_reports(id TEXT PRIMARY KEY,status TEXT,updated_at TEXT);
 CREATE TABLE profile_report_evidence(id TEXT PRIMARY KEY,report_id TEXT REFERENCES profile_reports(id) ON DELETE CASCADE,r2_key TEXT);
 CREATE TABLE message_conversations(id TEXT PRIMARY KEY,last_message_at TEXT);
 CREATE TABLE message_items(id TEXT PRIMARY KEY,conversation_id TEXT REFERENCES message_conversations(id) ON DELETE CASCADE);
 CREATE TABLE admin_audit_logs(id TEXT PRIMARY KEY,created_at TEXT);
 CREATE TABLE account_deletion_history(id TEXT PRIMARY KEY,deleted_at TEXT);
 CREATE TABLE operational_events(id TEXT PRIMARY KEY,created_at TEXT);
 CREATE TABLE site_settings(key TEXT PRIMARY KEY,value TEXT,updated_at TEXT);`);
 db.exec(`CREATE TABLE forum_posts(id TEXT PRIMARY KEY,topic_id TEXT,trashed_at TEXT);CREATE TABLE forum_topics(id TEXT PRIMARY KEY,trashed_at TEXT);CREATE TABLE forum_attachments(id TEXT PRIMARY KEY,r2_key TEXT,post_id TEXT,deleted_at TEXT,moderation_status TEXT,reviewed_at TEXT);CREATE TABLE forum_reports(id TEXT PRIMARY KEY,status TEXT,resolved_at TEXT);CREATE TABLE forum_notifications(id TEXT PRIMARY KEY,created_at TEXT);CREATE TABLE forum_rate_limits(key TEXT PRIMARY KEY,updated_at TEXT)`);
 for(const table of ['auth_sessions','account_tokens','auth_session_completions','apple_auth_attempts','apple_registration_intents','google_registration_intents','x_auth_attempts','x_registration_intents'])db.exec(`CREATE TABLE ${table}(id TEXT PRIMARY KEY,expires_at TEXT)`);
 return {db,DB:binding(db,()=>beforeBatch?.(db))};
}
const now='2027-12-01T12:00:00Z';
test('retention rollout cannot erase old records immediately and file deadlines include the notice window',async()=>{
 const {db,DB}=retainedFixture();try{
  db.exec("INSERT INTO profile_verification_files VALUES('old','private/old','2026-01-01')");
  assert.equal((await retention.purgeRetainedData({DB},'2026-10-14T12:00:00Z')).rollout,true);
  assert.equal(db.prepare('SELECT count(*) n FROM profile_verification_files').get().n,1);
  assert.equal(verificationRetentionExpiresAt('medical',new Date('2026-01-01')),RETENTION_ENFORCE_AT);
  assert.equal(verificationRetentionExpiresAt('identity',new Date('2026-12-01T12:00:00Z')),'2027-03-01T12:00:00.000Z');
 }finally{db.close();}
});
test('retention respects active disputes and legal holds; cascades content and queues only eligible media',async()=>{
 const {db,DB}=retainedFixture();try{
  db.exec(`INSERT INTO profile_verification_files VALUES('delete','private/delete','2026-01-01'),('hold','private/hold','2026-01-01'),('new','private/new','2028-01-01');
   INSERT INTO data_retention_holds VALUES('h1','verification','hold'),('h2','report','held-report'),('h3','conversation','held-chat');
   INSERT INTO profile_reports VALUES('closed','resolved','2026-01-01'),('pending','pending','2026-01-01'),('held-report','dismissed','2026-01-01');
   INSERT INTO profile_report_evidence VALUES('e1','closed','reports/delete'),('e2','pending','reports/pending'),('e3','held-report','reports/held');
   INSERT INTO message_conversations VALUES('old-chat','2026-01-01'),('held-chat','2026-01-01'),('new-chat','2027-11-01');
   INSERT INTO message_items VALUES('m1','old-chat'),('m2','held-chat');
   INSERT INTO auth_sessions VALUES('expired','2026-01-01'),('recent','2027-11-30');`);
  await retention.purgeRetainedData({DB},now);
  assert.deepEqual(db.prepare('SELECT id FROM profile_verification_files ORDER BY id').all().map(x=>x.id),['hold','new']);
  assert.deepEqual(db.prepare('SELECT id FROM profile_reports ORDER BY id').all().map(x=>x.id),['held-report','pending']);
  assert.deepEqual(db.prepare('SELECT id FROM message_items').all().map(x=>x.id),['m2']);
  assert.deepEqual(db.prepare('SELECT id FROM auth_sessions').all().map(x=>x.id),['recent']);
  assert.deepEqual(db.prepare('SELECT r2_key FROM data_deletion_jobs ORDER BY r2_key').all().map(x=>x.r2_key),['private/delete','reports/delete']);
  const failed=await retention.purgeMediaDeletionJobs({DB,MEDIA:{delete:async()=>{throw Error('offline')}}});assert.equal(failed.retryNeeded,true);
  assert.equal(db.prepare('SELECT count(*) n FROM data_deletion_jobs').get().n,2);
  const keys=[];assert.equal((await retention.purgeMediaDeletionJobs({DB,MEDIA:{delete:async items=>keys.push(...items)}})).processed,2);
  assert.equal(keys.length,2);assert.equal(db.prepare('SELECT count(*) n FROM data_deletion_jobs').get().n,0);
 }finally{db.close();}
});
test('stale retention reads cannot erase replaced documents or reopened reports',async()=>{
 let first=true;const {db,DB}=retainedFixture(sqlite=>{if(first){first=false;sqlite.exec("UPDATE profile_verification_files SET r2_key='private/replaced',retention_expires_at='2028-01-01'; UPDATE profile_reports SET status='pending',updated_at='2027-12-01'");}});
 try{db.exec("INSERT INTO profile_verification_files VALUES('file','private/old','2026-01-01');INSERT INTO profile_reports VALUES('report','resolved','2026-01-01');INSERT INTO profile_report_evidence VALUES('e','report','report/file')");
  await retention.purgeRetainedData({DB},now);
  assert.equal(db.prepare('SELECT r2_key FROM profile_verification_files').get().r2_key,'private/replaced');
  assert.equal(db.prepare('SELECT status FROM profile_reports').get().status,'pending');assert.equal(db.prepare('SELECT count(*) n FROM data_deletion_jobs').get().n,0);
 }finally{db.close();}
});
test('forum retention removes only retired files, old own notifications and closed unheld reports',async()=>{
 const {db,DB}=retainedFixture();try{
  db.exec(`INSERT INTO forum_topics VALUES('active',NULL),('trash','2026-01-01');
   INSERT INTO forum_posts VALUES('p','active',NULL),('pt','trash',NULL);
   INSERT INTO forum_attachments VALUES('deleted','forum/deleted','p','2026-01-01','approved',NULL),('rejected','forum/rejected','p',NULL,'rejected','2026-01-01'),('parent','forum/parent','pt',NULL,'approved',NULL),('held','forum/held','p','2026-01-01','approved',NULL),('new','forum/new','p','2027-11-30','approved',NULL),('active','forum/active','p',NULL,'approved',NULL);
   INSERT INTO data_retention_holds VALUES('fh','forum_attachment','held'),('rh','forum_report','held-report');
   INSERT INTO forum_reports VALUES('closed','resolved','2026-01-01'),('open','open',NULL),('held-report','dismissed','2026-01-01');
   INSERT INTO forum_notifications VALUES('old','2026-01-01'),('new','2027-11-30');
   INSERT INTO forum_rate_limits VALUES('old','2026-01-01'),('new','2027-11-30T18:00:00Z');`);
  await retention.purgeRetainedData({DB},now);
  assert.deepEqual(db.prepare('SELECT id FROM forum_attachments ORDER BY id').all().map(x=>x.id),['active','held','new']);
  assert.deepEqual(db.prepare('SELECT r2_key FROM data_deletion_jobs ORDER BY r2_key').all().map(x=>x.r2_key),['forum/deleted','forum/parent','forum/rejected']);
  assert.deepEqual(db.prepare('SELECT id FROM forum_reports ORDER BY id').all().map(x=>x.id),['held-report','open']);
  assert.deepEqual(db.prepare('SELECT id FROM forum_notifications').all().map(x=>x.id),['new']);
  assert.deepEqual(db.prepare('SELECT key FROM forum_rate_limits').all().map(x=>x.key),['new']);
 }finally{db.close();}
});
test('a file restored after retention selection cannot be removed or queued',async()=>{
 let calls=0;const {db,DB}=retainedFixture(sqlite=>{if(++calls===2)sqlite.exec("UPDATE forum_attachments SET deleted_at=NULL WHERE id='restored'");});
 try{db.exec("INSERT INTO forum_topics VALUES('t',NULL);INSERT INTO forum_posts VALUES('p','t',NULL);INSERT INTO forum_attachments VALUES('restored','forum/restored','p','2026-01-01','approved',NULL)");
  await retention.purgeRetainedData({DB},now);assert.equal(db.prepare('SELECT count(*) n FROM forum_attachments').get().n,1);assert.equal(db.prepare('SELECT count(*) n FROM data_deletion_jobs').get().n,0);
 }finally{db.close();}
});
test('persisted help filters private, draft, tester and malformed guides before serialization',async()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec(await readFile(new URL('../drizzle/0045_help_and_session_isolation.sql',import.meta.url),'utf8').then(s=>s.slice(0,s.indexOf('ALTER TABLE'))));
  const insert=db.prepare("INSERT INTO help_guides(id,audience,category,title,summary,aliases,steps,link_href,link_label,capability,tester_only,is_published,is_deleted) VALUES(?,?,?,?,?,'[]','[\"Paso de prueba\"]',?,?,?,?,?,?)");
  for(const [id,audience,path,capability,tester,published,deleted] of [['public','account','/mi-cuenta',null,0,1,0],['private','admin','/admin','settings.manage',0,1,0],['leak','all','/admin',null,0,1,0],['tester','account','/mi-cuenta',null,1,1,0],['draft','account','/mi-cuenta',null,0,0,0],['deleted','account','/mi-cuenta',null,0,1,1]])insert.run(id,audience,'QA',id,'Resumen',path,'Abrir',capability,tester,published,deleted);
  globalThis.__helpDb=drizzle(binding(db),{schema});
  assert.deepEqual((await help.getStoredHelpTopics('account')).map(x=>x.id),['public']);
  assert.deepEqual((await help.getStoredHelpTopics('account',{tester:true})).map(x=>x.id),['public','tester']);
  assert.deepEqual((await help.getStoredHelpTopics('admin',{capabilities:['settings.manage']})).map(x=>x.id),['leak','private']);
  assert.equal(policy.validHelpDestination('/admin','account'),false);assert.equal(policy.validHelpDestination('/mi-cuenta/../admin','account'),false);
 }finally{db.close();delete globalThis.__helpDb;}
});
test('DOB cutoff follows the Chilean calendar; stories display exact Chile time and newest first',()=>{
 assert.equal(account.defaultBirthDate,'2000-01-01');
 assert.equal(account.maximumBirthDate(new Date('2026-10-14T01:30:00Z')),'2008-10-13');
 assert.equal(account.maximumBirthDate(new Date('2026-10-14T12:30:00Z')),'2008-10-14');
 assert.deepEqual(newestStories([{id:'old',createdAt:'2026-10-13 23:00:00'},{id:'new',createdAt:'2026-10-14T02:00:00Z'}]).map(x=>x.id),['new','old']);
 assert.match(storyUploadLabel('2026-10-14T02:15:00Z'),/13.*10.*2026.*23:15/);
});
