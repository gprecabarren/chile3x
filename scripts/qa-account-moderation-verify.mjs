import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
const f=JSON.parse(readFileSync('outputs/qa-account-moderation.json'));assert.ok(f.prefix.startsWith('qa_account_'));
const db=new DatabaseSync('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
const base='http://127.0.0.1:3000';
const get=(path,cookie)=>fetch(base+path,{headers:{authorization:'qa-local',...(cookie?{cookie}:{})},redirect:'manual'});
const post=(path,body,cookie=f.cookies.owner,origin=base)=>fetch(base+path,{method:'POST',headers:{cookie,origin},body,redirect:'manual'});
const profile=f.profiles[0],metadata=()=>db.prepare('SELECT metadata FROM profile_details WHERE profile_id=?').get(profile).metadata;
try {
 assert.equal((await get('/api/admin/moderacion-resumen')).status,401);assert.equal((await get('/api/admin/moderacion-resumen',f.cookies.owner)).status,401);
 const summary=await get('/api/admin/moderacion-resumen',f.cookies.admin);assert.equal(summary.status,200);assert.match(summary.headers.get('cache-control'),/no-store/);assert.ok((await summary.json()).items.some(p=>p.id===f.profiles[3]));
 db.prepare("UPDATE admin_github_access SET access_level='support' WHERE user_id=?").run(f.users[0]);assert.equal((await get('/api/admin/moderacion-resumen',f.cookies.admin)).status,403);db.prepare("UPDATE admin_github_access SET access_level='administrator' WHERE user_id=?").run(f.users[0]);
 for(const query of ['', '?categoria=agency&tipo=agency','?categoria=contenido','?categoria=rental','?tag=masajes']) {
  const response=await get('/venta-contenido'+query);assert.equal(response.status,200);const html=await response.text();assert.match(html,/QA Solo contenido/);assert.match(html,/QA Perfil mixto/);assert.doesNotMatch(html,/QA Sin venta/);assert.doesNotMatch(html,/QA Perfil mixto[^]*QA.*pendiente/);
 }
 const rootHtml=await (await get('/venta-contenido')).text();assert.match(rootHtml,/<link rel="canonical" href="https:\/\/chile3x.cl\/venta-contenido"/);assert.doesNotMatch(rootHtml,/<meta name="robots" content="[^"]*noindex/);
 const tier=await (await get('/venta-contenido?categoria=bronze')).text();assert.match(tier,/QA Solo contenido/);assert.doesNotMatch(tier,/QA Perfil mixto/);
 const fields={type:'escort',tier:'premium',handle:f.prefix.replaceAll('_','-')+'-profile',display_name:'QA Perfil mixto',region:'Región del Biobío',city:'Concepción',short_description:'Perfil ficticio local',description:'Este es un perfil ficticio para pruebas técnicas locales y no representa una oferta real.',contact_whatsapp:'56912345678',gender:'Femenino',intent:'draft'};
 const form=age=>{const body=new FormData();for(const [key,value] of Object.entries({...fields,age}))body.set(key,value);body.append('tags','venta-contenido');return body;};
 const original=metadata();
 for(const age of ['', '17','17.5','100']){const response=await post('/api/perfiles/'+profile,form(age));assert.equal(response.status,303);assert.match(response.headers.get('location'),/error=validation/);assert.equal(metadata(),original);}
 assert.equal((await post('/api/perfiles/'+profile,form('23'),f.cookies.owner,'https://other.invalid')).status,403);
 const saved=await post('/api/perfiles/'+profile,form('23'));assert.equal(saved.status,303);assert.doesNotMatch(saved.headers.get('location'),/error=/);assert.equal(JSON.parse(metadata()).age,'23');assert.equal(db.prepare('SELECT status FROM profiles WHERE id=?').get(profile).status,'pending');
 db.prepare("INSERT INTO site_settings(key,value) VALUES('mail_alerts_enabled','enabled') ON CONFLICT(key) DO UPDATE SET value='enabled'").run();db.prepare("INSERT INTO site_settings(key,value) VALUES('mail_alert_recipient','qa@example.invalid') ON CONFLICT(key) DO UPDATE SET value='qa@example.invalid'").run();
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0O8AAAAASUVORK5CYII=','base64');
 for(let i=0;i<2;i++){const body=new FormData();body.set('file',new File([bytes],'local-qa.png',{type:'image/png'}));const r=await post('/api/perfiles/'+profile+'/media',body);assert.equal(r.status,201,await r.clone().text());}
 assert.equal(db.prepare("SELECT count(*) n FROM admin_notifications WHERE profile_id=? AND kind='media_uploaded'").get(profile).n,2);
 assert.equal(db.prepare("SELECT count(*) n FROM moderation_email_jobs WHERE profile_id=? AND kind='media_uploaded'").get(profile).n,1);
 const count=await (await get('/api/admin/moderacion-resumen',f.cookies.admin)).json();assert.equal(count.items.find(p=>p.id===profile).files,2);
 const notification=db.prepare("SELECT id FROM admin_notifications WHERE profile_id=? AND kind='media_uploaded' LIMIT 1").get(profile);const read=new FormData();read.set('notification_id',notification.id);read.set('return_to','/admin');assert.equal((await post('/api/admin/notificaciones',read,f.cookies.admin)).status,303);assert.equal((await (await get('/api/admin/moderacion-resumen',f.cookies.admin)).json()).items.find(p=>p.id===profile).files,2);
 db.prepare("UPDATE profiles SET is_demo=0,status='approved' WHERE id=?").run(profile);db.prepare("UPDATE profile_details SET metadata=json_set(metadata,'$.instagram_url','https://instagram.com/qa_local','$.arsmate_url','https://arsmate.com/qa_local','$.onlyfans_url','https://onlyfans.com/qa_local') WHERE profile_id=?").run(profile);db.prepare("INSERT INTO profile_services(id,profile_id,kind,service) VALUES(?,?,'included','Videollamada')").run(f.prefix+'_video_call',profile);
 console.log('PASS: private permissions, scoped content search/tier filters, indexable canonical SEO, mandatory adult age even drafts, CSRF, pending uploads, new notification history, coalesced email outbox, and read-vs-approval separation. No remote D1 or real mail.');
} finally {db.prepare("UPDATE admin_github_access SET access_level='administrator' WHERE user_id=?").run(f.users[0]);db.close();}
