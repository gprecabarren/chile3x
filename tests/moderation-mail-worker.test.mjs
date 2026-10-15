import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
let source=await readFile(new URL('../worker/moderation-mail.ts',import.meta.url),'utf8');
const stub='data:text/javascript,'+encodeURIComponent('export async function sendPortalEmail(value){globalThis.__moderationSent.push(value);return true;}');
source=source.replace('"../lib/account-email"',JSON.stringify(stub));
const worker=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(`CREATE TABLE site_settings(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE profiles(id TEXT PRIMARY KEY,display_name TEXT,status TEXT,trashed_at TEXT);CREATE TABLE moderation_email_jobs(id TEXT PRIMARY KEY,profile_id TEXT,kind TEXT,state TEXT DEFAULT 'pending',created_at TEXT DEFAULT CURRENT_TIMESTAMP,finished_at TEXT);CREATE TABLE profile_media(profile_id TEXT,moderation_status TEXT);CREATE TABLE exclusive_content_media(collection_id TEXT,moderation_status TEXT);CREATE TABLE exclusive_content_collections(id TEXT,profile_id TEXT);`);
 const DB={prepare(query){let values=[];return{bind(...args){values=args;return this;},async all(){return{results:sqlite.prepare(query).all(...values)};},async first(){return sqlite.prepare(query).get(...values)??null;},async run(){return{meta:sqlite.prepare(query).run(...values)};}};}};
 return{sqlite,env:{DB}};
}
test('scheduled moderation emails are bounded, claimed once, configured, and skip resolved listings',async()=>{
 const {sqlite,env}=fixture();globalThis.__moderationSent=[];
 try {
  for(const [key,value] of Object.entries({mail_alerts_enabled:'enabled',mail_alert_recipient:'team@example.invalid'}))sqlite.prepare('INSERT INTO site_settings VALUES(?,?)').run(key,value);
  sqlite.exec(`INSERT INTO profiles VALUES('new','Anuncio nuevo','pending',NULL),('media','Galería','approved',NULL),('resolved','Resuelto','approved',NULL),('trashed','Papelera','pending','2026-10-14');INSERT INTO profile_media VALUES('media','pending');INSERT INTO moderation_email_jobs(id,profile_id,kind) VALUES('1','new','profile_created'),('2','media','media_uploaded'),('3','resolved','profile_updated'),('4','trashed','profile_created');`);
  await worker.handleModerationMailScheduled(env);await worker.handleModerationMailScheduled(env);
  assert.equal(globalThis.__moderationSent.length,2);assert.ok(globalThis.__moderationSent.every(m=>m.email==='team@example.invalid'&&m.kind==='moderation_alert'));
  assert.equal(sqlite.prepare("SELECT count(*) n FROM moderation_email_jobs WHERE state='accepted'").get().n,2);assert.equal(sqlite.prepare("SELECT count(*) n FROM moderation_email_jobs WHERE state='skipped'").get().n,2);
  assert.doesNotMatch(JSON.stringify(globalThis.__moderationSent),/r2_key|identity|password|token/);
  sqlite.prepare("UPDATE site_settings SET value='disabled' WHERE key='mail_alerts_enabled'").run();sqlite.prepare("INSERT INTO moderation_email_jobs(id,profile_id,kind) VALUES('5','new','profile_created')").run();await worker.handleModerationMailScheduled(env);assert.equal(globalThis.__moderationSent.length,2);assert.equal(sqlite.prepare("SELECT state FROM moderation_email_jobs WHERE id='5'").get().state,'skipped');
 } finally {sqlite.close();delete globalThis.__moderationSent;}
});
test('incoming forwarding is exact-address only, disabled by default, and never stores message contents',async()=>{
 const {sqlite,env}=fixture();const forwarded=[],rejected=[];
 const message={from:'visitor@example.invalid',to:'support@chile3x.cl',forward:async value=>forwarded.push(value),setReject:value=>rejected.push(value)};
 try {
  await worker.forwardConfiguredInbound(message,env);assert.equal(rejected.length,1);assert.equal(forwarded.length,0);
  for(const [key,value] of Object.entries({mail_inbound_mode:'forward',mail_inbound_address:'support@chile3x.cl',mail_inbound_destination:'team@example.invalid'}))sqlite.prepare('INSERT INTO site_settings VALUES(?,?)').run(key,value);
  await worker.forwardConfiguredInbound(message,env);assert.deepEqual(forwarded,['team@example.invalid']);await worker.forwardConfiguredInbound({...message,to:'other@chile3x.cl'},env);assert.equal(forwarded.length,1);
  await worker.forwardConfiguredInbound({...message,from:'team@example.invalid'},env);assert.equal(forwarded.length,1);assert.equal(rejected.length,3);
 } finally {sqlite.close();}
});
