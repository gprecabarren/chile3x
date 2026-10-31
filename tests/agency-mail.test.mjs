import test from'node:test';import assert from'node:assert/strict';import{DatabaseSync}from'node:sqlite';import{readFileSync,readdirSync}from'node:fs';import{stripTypeScriptTypes}from'node:module';
test('agency email jobs suppress canceled/expired notices, claim atomically and distinguish non-attempts from uncertainty',async()=>{
 const db=new DatabaseSync(':memory:');for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
 const prepare=(query,args=[])=>({bind:(...values)=>prepare(query,values),async first(){return db.prepare(query).get(...args)??null;},async all(){return{results:db.prepare(query).all(...args)};},async run(){return{meta:db.prepare(query).run(...args)};}});
 const stub='data:text/javascript,'+encodeURIComponent('export async function sendPortalEmail(data){globalThis.__agencyMailCalls.push(data);return globalThis.__agencyMailAccepted}');
 const code=readFileSync('worker/agency-mail.ts','utf8').replace('"../lib/account-email"',JSON.stringify(stub));const{handleAgencyMailScheduled}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(code)).toString('base64'));
 const env={DB:{prepare}},future=Date.now()+3600000;
 globalThis.__agencyMailCalls=[];globalThis.__agencyMailAccepted=true;
 try{
 db.exec("INSERT INTO users(id,email,username,is_active,email_verified_at)VALUES('mail-owner','owner@example.invalid','mail-owner',1,CURRENT_TIMESTAMP),('mail-recipient','recipient@example.invalid','mail-recipient',1,CURRENT_TIMESTAMP);");
 db.exec("INSERT INTO profiles(id,owner_id,type,status,slug,display_name,region,city)VALUES('mail-agency','mail-owner','agency','draft','mail-agency','Agencia local','Región del Biobío','Concepción'),('mail-profile','mail-recipient','escort','approved','mail-profile','Perfil local','Región del Biobío','Concepción');");
 db.prepare("INSERT INTO agency_membership_requests(id,agency_profile_id,escort_profile_id,requested_by,status,expires_at)VALUES('mail-invite','mail-agency','mail-profile','mail-owner','cancelled',?)").run(future);
 const job=id=>db.prepare("INSERT INTO agency_email_jobs(id,recipient_id,agency_profile_id,escort_profile_id,kind)VALUES(?,'mail-recipient','mail-agency','mail-profile','invitation')").run(id);
 job('mail-invite:'+future+':invite');await handleAgencyMailScheduled(env);assert.equal(globalThis.__agencyMailCalls.length,0);assert.equal(db.prepare('SELECT status FROM agency_email_jobs').get().status,'failed');
 db.exec('DELETE FROM agency_email_jobs');db.exec("UPDATE agency_membership_requests SET status='pending'");job('mail-invite:'+future+':invite');await Promise.all([handleAgencyMailScheduled(env),handleAgencyMailScheduled(env)]);assert.equal(globalThis.__agencyMailCalls.length,1);assert.equal(db.prepare('SELECT status FROM agency_email_jobs').get().status,'accepted');
 db.exec('DELETE FROM agency_email_jobs');job('mail-invite:'+future+':invite');globalThis.__agencyMailAccepted=false;await handleAgencyMailScheduled(env);assert.equal(db.prepare('SELECT status FROM agency_email_jobs').get().status,'failed','No delivery record means uncertain: do not resend');
 db.exec('DELETE FROM agency_email_jobs');job('mail-invite:'+future+':invite');db.prepare("INSERT INTO email_delivery_logs(id,audience,kind,recipient,subject,status,attempts,created_at)VALUES('mail-log','account','portal_notification','recipient@example.invalid','Invitación de agencia · Chile3X','skipped','[]',CURRENT_TIMESTAMP)").run();await handleAgencyMailScheduled(env);const pending=db.prepare('SELECT * FROM agency_email_jobs').get();assert.equal(pending.status,'pending');assert.ok(pending.next_attempt_at>Date.now());assert.equal(pending.attempts,1);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{db.close();delete globalThis.__agencyMailCalls;delete globalThis.__agencyMailAccepted;}
});
