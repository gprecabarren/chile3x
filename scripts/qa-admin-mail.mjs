// Explicitly disposable local-only records. No emails are sent by this script.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base=process.env.QA_LOCAL_BASE??'http://localhost:3000';
assert.ok(['http://localhost:3000','http://127.0.0.1:8788'].includes(base));
const fixture=JSON.parse(readFileSync('outputs/qa-media-admin.json','utf8'));
assert.ok(fixture.prefix.startsWith('qa_media_'));
const database=resolve('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(database.startsWith(resolve('.wrangler/visual-state')+'\\'));
const db=new DatabaseSync(database);
const prefix=fixture.prefix+'_mail_';
try {
 if(process.argv[2]==='cleanup') {
  const records=db.prepare('SELECT id FROM email_delivery_logs WHERE id LIKE ?').all(prefix+'%');
  for(const {id} of records){assert.ok(id.startsWith(prefix));db.prepare('DELETE FROM email_delivery_logs WHERE id=?').run(id);}
  console.log(`Removed ${records.length} disposable local email-history rows; no actual emails or production changes.`);
 } else {
  assert.ok(db.prepare('SELECT id FROM users WHERE id=?').get(fixture.admin));
  assert.equal(db.prepare('SELECT count(*) n FROM email_delivery_logs WHERE id LIKE ?').get(prefix+'%').n,0,'Clean old local mail fixtures before rerunning');
  for(const id of [fixture.admin,fixture.owner])db.prepare('UPDATE auth_sessions SET expires_at=? WHERE user_id=?').run(new Date(Date.now()+12*3600000).toISOString(),id);
  const original=db.prepare('SELECT access_level FROM admin_github_access WHERE user_id=?').get(fixture.admin).access_level;
  const get=(path,cookie)=>fetch(base+path,{headers:{...(cookie?{cookie}:{})},redirect:'manual'});
  try {
   db.prepare("UPDATE admin_github_access SET access_level='administrator' WHERE user_id=?").run(fixture.admin);
   for(let i=0;i<26;i++)db.prepare('INSERT INTO email_delivery_logs(id,user_id,recipient,audience,kind,subject,status,provider,detail,attempts,created_at,finished_at,duration_ms) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(prefix+i,i%2?fixture.admin:fixture.owner,(i%2?'admin':'usuario')+'@example.invalid',i%2?'admin':'account',i%3?'password_reset':'account_verification','QA Historial '+i,i%4?'accepted':'failed','cloudflare_email','Registro ficticio local. No se envió un correo.',JSON.stringify([{provider:'google_relay',accepted:false,code:'HTTP_403'},{provider:'cloudflare_email',accepted:i%4!==0,code:i%4?'ACCEPTED':'E_DAILY_LIMIT_EXCEEDED'}]),new Date(Date.now()-i*60000).toISOString(),new Date().toISOString(),150);
   for(const path of ['/admin/acceso-denegado','/admin/acceso-denegado?reason=oauth_invalid']){const result=await get(path,fixture.adminCookie);assert.equal(result.status,200);assert.match(await result.text(),/Acceso confirmado/);}
   const permission=await get('/admin/acceso-denegado?reason=permission',fixture.adminCookie);assert.equal(permission.status,200);assert.match(await permission.text(),/No tienes el permiso necesario/);
   const repeatedCallback=await get('/api/auth/github/callback',fixture.adminCookie);assert.equal(repeatedCallback.status,307);assert.equal(new URL(repeatedCallback.headers.get('location'),base).pathname,'/admin');
   const oldWarning=await get('/admin/acceso-denegado?reason=oauth_invalid',fixture.ownerCookie);assert.equal(oldWarning.status,200);assert.match(await oldWarning.text(),/no significa que tus permisos/);
   for(const cookie of [undefined,fixture.ownerCookie]){const response=await get('/admin/correos',cookie);assert.equal(response.status,307);assert.match(response.headers.get('location'),/auth\/github\/start/);assert.doesNotMatch(await response.text(),/usuario@example.invalid/);}
   const page=await get('/admin/correos?period=all',fixture.adminCookie);assert.equal(page.status,200);const html=await page.text();assert.match(html,/usuario@example.invalid/);assert.match(html,/admin@example.invalid/);assert.match(html,/Siguiente/);
   const page2=await get('/admin/correos?period=all&page=2',fixture.adminCookie);assert.equal(page2.status,200);assert.match(await page2.text(),/QA Historial 25/);
   const filtered=await get('/admin/correos?period=all&audience=account&status=failed&provider=google_relay',fixture.adminCookie);const filteredHtml=await filtered.text();assert.match(filteredHtml,/usuario@example.invalid/);assert.doesNotMatch(filteredHtml,/Destinatario<\/dt><dd>admin@example.invalid/);assert.match(filteredHtml,/E_DAILY_LIMIT_EXCEEDED/);
   db.prepare("UPDATE admin_github_access SET access_level='moderator' WHERE user_id=?").run(fixture.admin);
   const blocked=await get('/admin/correos',fixture.adminCookie);assert.equal(blocked.status,307);assert.match(blocked.headers.get('location'),/reason=permission/);
   console.log('PASS: active-admin stale warning resumes, real permission denial remains, public accounts cannot read global history, all recipients visible, provider-attempt filtering and SQL pagination. No emails sent.');
  } finally {db.prepare('UPDATE admin_github_access SET access_level=? WHERE user_id=?').run(original,fixture.admin);}
 }
} finally {db.close();}
