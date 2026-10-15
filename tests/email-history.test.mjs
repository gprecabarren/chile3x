import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import { canViewEmailHistory, emailErrorCode, historySubject, safeEmailAttempts } from '../lib/email-history-policy.ts';
import { chileDayBoundary, validIsoDay } from '../lib/chile-date-boundary.ts';

const sourceFile=path=>new URL('../'+path,import.meta.url);
const stub='data:text/javascript,'+encodeURIComponent(`
 export const getDb=async()=>{};
 export const createOpaqueToken=()=>'', sha256=async()=>'';
 export const recordOperationalEvent=async input=>globalThis.__emailTest.operations.push(input);
 export const getSiteSettings=async()=>{if(globalThis.__emailTest.settingsFail)throw Error('secret');return {contact_email:'support@example.test',mail_delivery_mode:globalThis.__emailTest.mode||'auto',mail_sender_name:'Chile3X',mail_sender_address:'noreply@chile3x.cl',mail_reply_to:'',mail_google_relay_url:''};},siteBaseUrl=x=>x;
 export const readMailCredentials=async()=>({secret:env.GOOGLE_APPS_SCRIPT_SECRET,fallbackUrl:env.GOOGLE_APPS_SCRIPT_URL});
 export const emailVerificationState=()=>'';
 export const isReservedPublicAccountIdentity=async()=>false;
 export const beginEmailHistory=async input=>{globalThis.__emailTest.history.push({id:String(globalThis.__emailTest.history.length),...input});return globalThis.__emailTest.history.at(-1).id;};
 export const finishEmailHistory=async(id,input)=>Object.assign(globalThis.__emailTest.history.find(x=>x.id===id),input);
 export const env={get GOOGLE_APPS_SCRIPT_URL(){return globalThis.__emailTest.relay?'https://relay.example.test':undefined;},get GOOGLE_APPS_SCRIPT_SECRET(){return 'relay-secret';},get EMAIL(){return globalThis.__emailTest.cloudflare?{send:async message=>{globalThis.__emailTest.calls.push({provider:'cloudflare',message});if(globalThis.__emailTest.cloudflareError)throw globalThis.__emailTest.cloudflareError;return {messageId:'message-123'};}}:undefined;}};
`);
let source=await readFile(sourceFile('lib/account-email.ts'),'utf8');
source=source.replace(/from "([^"\n]+)"/g,(_match,path)=>'from '+JSON.stringify(path==='drizzle-orm'?import.meta.resolve(path):path==='@/db/schema'?sourceFile('db/schema.ts').href:path==='@/lib/test-email'?sourceFile('lib/test-email.ts').href:path==='@/lib/email-history-policy'?sourceFile('lib/email-history-policy.ts').href:stub));
source=source.replace('import("cloudflare:workers")',`import(${JSON.stringify(stub)})`);
const {sendPortalEmail}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
async function scenario(options,work) {
 const original=globalThis.fetch;
 const state={history:[],operations:[],calls:[],relay:true,cloudflare:true,...options};globalThis.__emailTest=state;
 globalThis.fetch=async(_url,init)=>{state.calls.push({provider:'relay',message:JSON.parse(init.body)});if(state.relayError)throw state.relayError;return Response.json({ok:state.relayOk!==false},{status:state.relayStatus??200});};
 try {await work(state);}finally{globalThis.fetch=original;delete globalThis.__emailTest;}
}
const message={email:'person@example.test',subject:'Recuperar acceso',heading:'Recuperar',message:'Contenido privado',action:{label:'Recuperar',href:'https://chile3x.cl/restablecer-clave?token=secret-token'},kind:'password_reset'};

test('all transactional kinds and recipient roles use one global history without retaining recovery links',async()=>{
 await scenario({},async state=>{
  for(const kind of ['account_verification','password_reset','profile_approved','account_disabled','city_alert','portal_notification'])assert.equal(await sendPortalEmail({...message,kind}),true);
  assert.equal(state.history.length,6);assert.equal(state.calls.length,6);
  for(const item of state.history){assert.equal(item.status,'accepted');assert.equal(item.provider,'google_relay');assert.equal(item.email,'person@example.test');assert.equal(item.attempts.length,1);assert.doesNotMatch(JSON.stringify(item),/secret-token|Contenido privado|relay-secret/);}
 });
});
test('failed primary and successful alternative are retained as separate attempts of one email',async()=>{
 await scenario({relayStatus:403},async state=>{
  assert.equal(await sendPortalEmail(message),true);assert.equal(state.history.length,1);
  assert.deepEqual(state.history[0].attempts,[{provider:'google_relay',accepted:false,code:'HTTP_403'},{provider:'cloudflare_email',accepted:true,code:'ACCEPTED',messageId:'message-123'}]);
  assert.equal(state.history[0].status,'accepted');
 });
});
test('both provider failures retain bounded codes but never raw sensitive errors',async()=>{
 await scenario({relayError:new DOMException('token-secret','TimeoutError'),cloudflareError:Object.assign(Error('private@example.test secret'),{code:'E_DAILY_LIMIT_EXCEEDED'})},async state=>{
  assert.equal(await sendPortalEmail(message),false);assert.equal(state.history[0].status,'failed');
  assert.deepEqual(state.history[0].attempts.map(x=>x.code),['PROVIDER_TIMEOUT','E_DAILY_LIMIT_EXCEEDED']);
  assert.doesNotMatch(JSON.stringify(state.history),/token-secret|private@example|secret-token/);
 });
});
test('invalid recipients, reserved test addresses and absent services remain visible without external delivery',async()=>{
 await scenario({},async state=>{
  assert.equal(await sendPortalEmail({...message,email:'invalid'}),false);
  assert.equal(await sendPortalEmail({...message,email:'qa@example.invalid'}),false);
  assert.equal(state.calls.length,0);assert.deepEqual(state.history.map(x=>x.status),['failed','skipped']);
 });
 await scenario({relay:false,cloudflare:false},async state=>{assert.equal(await sendPortalEmail(message),false);assert.equal(state.history[0].status,'failed');assert.equal(state.calls.length,0);});
 await scenario({settingsFail:true},async state=>{assert.equal(await sendPortalEmail(message),false);assert.equal(state.history[0].status,'failed');});
});
test('history access and serialization minimize private data and reject excessive error strings',()=>{
 for(const accessLevel of ['support','editor','moderator'])assert.equal(canViewEmailHistory({accessLevel}),false);
 for(const accessLevel of ['owner','administrator'])assert.equal(canViewEmailHistory({accessLevel}),true);
 assert.equal(canViewEmailHistory(null),false);
 assert.equal(emailErrorCode({code:'secret@recipient.test'}),'PROVIDER_ERROR');
 const value=safeEmailAttempts([{provider:'google_relay',accepted:false,code:'SECRET token',messageId:'?token=secret',body:'secret-body'}]);
 assert.doesNotMatch(value,/secret|body|token/i);
 assert.equal(historySubject('Correo\nhttps://example.test/?token=SECRET'),'Correo [enlace protegido]');
});
test('filters cover whole Chilean calendar days and reject impossible dates',()=>{
 assert.equal(validIsoDay('2026-02-30'),'');assert.equal(validIsoDay('2026-02-28'),'2026-02-28');
 assert.equal(chileDayBoundary('2026-10-14'),'2026-10-14T03:00:00.000Z');
 assert.equal(chileDayBoundary('2026-10-14',true),'2026-10-15T02:59:59.999Z');
});
test('global history is paginated, permission checked, retained for 90 days and account deletion removes records',async()=>{
 const [page,recording,deletion,retention,denied,callback]=await Promise.all(['app/admin/correos/page.tsx','lib/email-history.ts','lib/account-deletion.ts','worker/data-retention.ts','app/admin/acceso-denegado/page.tsx','app/api/auth/github/callback/route.ts'].map(path=>readFile(sourceFile(path),'utf8')));
 assert.match(page,/if \(!canViewEmailHistory\(admin\)\) redirect/);assert.match(page,/limit\(PAGE_SIZE\)\.offset/);
 assert.match(page,/json_each/);assert.match(page,/Historial global de correos/);assert.doesNotMatch(page,/eq\(emailDeliveryLogs.userId, admin.id\)/);
 assert.match(recording,/account.accessLevel === "owner"/);assert.match(recording,/protectedEmail/);assert.doesNotMatch(recording,/input\.(html|text|token|action|message)/);
 assert.match(retention,/email_delivery_logs.*RETENTION_DAYS.emailHistory/);assert.match(deletion,/db.delete\(emailDeliveryLogs\)/);
 assert.match(denied,/Boolean\(admin && \(!reason \|\| loginError\)\)/);assert.match(denied,/resumeSession && <ResumeAdminSession/);assert.match(callback,/oauth_invalid/);assert.match(callback,/oauth_provider/);
});

test('real history storage classifies normal, admin and owner recipients, cascades deletion and does not resurrect removed rows',async()=>{
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON; CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,role TEXT); CREATE TABLE admin_github_identities(user_id TEXT,github_email TEXT); CREATE TABLE admin_github_access(user_id TEXT,access_level TEXT,protected_email TEXT);');
 db.exec(await readFile(sourceFile('drizzle/0051_email_delivery_history.sql'),'utf8'));
 db.exec("INSERT INTO users VALUES('user','person@example.test','advertiser'),('admin','github+1@example.test','admin'),('owner','github+2@example.test','admin'); INSERT INTO admin_github_identities VALUES('admin','admin@example.test'); INSERT INTO admin_github_access VALUES('admin','administrator','admin@example.test'),('owner','owner','owner@example.test');");
 const binding={prepare(query){return {bind(...values){return {async raw(){const statement=db.prepare(query);statement.setReturnArrays(true);return statement.all(...values);},async run(){return {meta:db.prepare(query).run(...values)};}};}};}};
 const storageStub='data:text/javascript,'+encodeURIComponent('export const getDb=async()=>globalThis.__emailDb;export const recordOperationalEvent=async()=>{};');
 let historySource=await readFile(sourceFile('lib/email-history.ts'),'utf8');
 historySource=historySource.replace(/from "([^"\n]+)"/g,(_match,path)=>'from '+JSON.stringify(path==='drizzle-orm'?import.meta.resolve(path):path==='@/db/schema'?sourceFile('db/schema.ts').href:path==='@/lib/email-history-policy'?sourceFile('lib/email-history-policy.ts').href:storageStub));
 const history=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(historySource)).toString('base64'));
 globalThis.__emailDb=drizzle(binding);
 try {
  for(const [email,audience] of [['person@example.test','account'],['admin@example.test','admin'],['owner@example.test','owner'],['external@example.test','other']]) {
   const id=await history.beginEmailHistory({email,kind:'password_reset',subject:'Recuperar',startedAt:new Date().toISOString()});assert.ok(id);
   assert.equal(db.prepare('SELECT audience FROM email_delivery_logs WHERE id=?').get(id).audience,audience);
   await history.finishEmailHistory(id,{status:'accepted',provider:'google_relay',detail:'Aceptado',durationMs:12,attempts:[{provider:'google_relay',accepted:true,code:'ACCEPTED',token:'PRIVATE'}]});
   const saved=db.prepare('SELECT * FROM email_delivery_logs WHERE id=?').get(id);assert.equal(saved.status,'accepted');assert.doesNotMatch(saved.attempts,/PRIVATE/);
  }
  const removed=db.prepare("SELECT id FROM email_delivery_logs WHERE user_id='user'").get().id;db.exec("DELETE FROM users WHERE id='user'");
  await history.finishEmailHistory(removed,{status:'failed',provider:null,detail:'Fallo',durationMs:0,attempts:[]});
  assert.equal(db.prepare('SELECT count(*) n FROM email_delivery_logs WHERE id=?').get(removed).n,0);
 }finally{db.close();delete globalThis.__emailDb;}
});
