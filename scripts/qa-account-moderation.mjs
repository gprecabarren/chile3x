// Disposable loopback-only QA. Never connects to remote D1 or sends real mail.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash,randomBytes } from 'node:crypto';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
const directory=resolve('.wrangler/visual-state');
const database=resolve(directory,'v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(database.startsWith(directory+'\\'));
const db=new DatabaseSync(database);db.exec('PRAGMA foreign_keys=ON');
const manifest='outputs/qa-account-moderation.json';
const mode=process.argv[2];
if(mode==='seed') {
 mkdirSync('outputs',{recursive:true});const prefix='qa_account_'+randomBytes(5).toString('hex');const fixture={prefix,users:[],profiles:[],cookies:{},settings:db.prepare("SELECT * FROM site_settings WHERE key LIKE 'mail_%'").all()};
 for(let i=0;i<5;i++) {
  const id=prefix+'_u'+i;fixture.users.push(id);db.prepare('INSERT INTO users(id,email,username,display_name,role,is_active,email_verified_at,city) VALUES(?,?,?,?,?,1,?,?)').run(id,id+'@example.invalid',id,i===0?'Administración QA':'Cuenta QA '+i,i===0?'admin':'advertiser',new Date().toISOString(),'Concepción');
  if(i<2) {const secret=randomBytes(24).toString('hex'),session=prefix+'_s'+i;db.prepare('INSERT INTO auth_sessions(id,user_id,token_hash,auth_method,expires_at) VALUES(?,?,?,?,?)').run(session,id,createHash('sha256').update(secret).digest('hex'),i===0?'github':'password',new Date(Date.now()+12*3600000).toISOString());fixture.cookies[i===0?'admin':'owner']=(i===0?'chile3x_admin_session':'chile3x_user_session')+'='+session+'.'+secret;}
  if(i===0) {db.prepare('INSERT INTO admin_github_access(id,github_login,user_id,access_level,is_active) VALUES(?,?,?,?,1)').run(prefix+'_grant',prefix,id,'administrator');continue;}
  const profile=prefix+'_p'+i;fixture.profiles.push(profile);db.prepare('INSERT INTO profiles(id,owner_id,type,status,slug,handle,display_name,short_description,description,region,city,tier,is_demo,contact_whatsapp,contact_telegram) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)').run(profile,id,'escort',i===4?'pending':'approved',profile,profile,'QA '+(i===2?'Solo contenido':i===3?'Sin venta':'Perfil mixto'),'Perfil ficticio local','Solo prueba local; no representa una oferta real.','Región del Biobío','Concepción',['vip','premium','bronze'][i%3],'56912345678','qa_local');
  db.prepare('INSERT INTO profile_details(profile_id,contact_phone,contact_email,metadata) VALUES(?,?,?,?)').run(profile,'56912345678','qa@example.invalid',JSON.stringify({age:'23',gender:'Femenino',instagram:'qa_local',arsmate_url:'https://arsmate.com/qa_local',onlyfans_url:'https://onlyfans.com/qa_local',video_call:'1',...(i===2?{content_only:'1'}:{})}));
  if(i!==3) db.prepare('INSERT INTO profile_tags(id,profile_id,tag) VALUES(?,?,?)').run(prefix+'_tag'+i,profile,'venta-contenido');
 }
 writeFileSync(manifest,JSON.stringify(fixture));console.log('Disposable local account/admin fixtures ready.');db.close();
} else if(mode==='serve') {
 const fixture=JSON.parse(readFileSync(manifest));assert.ok(fixture.prefix.startsWith('qa_account_'));db.close();
 let sharedRole='owner',failSessionCheck=false;
 for(const [role,port] of [['owner',3001],['admin',3002],['shared',3003]])createServer(async(req,res)=>{
  try {
   // Disposable same-origin switch for cross-tab display QA; never a production endpoint.
   if(role==='shared'&&/^\/__qa\/mode\/(owner|admin)$/.test(req.url??'')) {
    sharedRole=req.url.endsWith('/admin')?'admin':'owner';res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({mode:sharedRole}));return;
   }
   if(role==='shared'&&/^\/__qa\/session-state\/(fail|ready)$/.test(req.url??'')) {failSessionCheck=req.url.endsWith('/fail');res.writeHead(200);res.end('Local session-check fixture updated.');return;}
   if(role==='shared'&&failSessionCheck&&req.url==='/api/auth/session/state'){res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end('{"error":"qa_unavailable"}');return;}
   const headers=new Headers();
   for(const [key,value] of Object.entries(req.headers))if(value&&!['host','cookie','connection','content-length','accept-encoding'].includes(key))headers.set(key,Array.isArray(value)?value.join(','):value);
   if(headers.get('origin')===`http://127.0.0.1:${port}`)headers.set('origin','http://127.0.0.1:3000');
   const browserCookies=(req.headers.cookie??'').split(';').map(value=>value.trim()).filter(value=>value.startsWith('__Host-chile3x_browser='));
   headers.set('cookie',[fixture.cookies[role==='shared'?sharedRole:role],...browserCookies].join('; '));headers.set('authorization','qa-loopback');
   let body;if(!['GET','HEAD'].includes(req.method??'GET')){const chunks=[];for await(const chunk of req)chunks.push(chunk);body=Buffer.concat(chunks);}
   const payload=await fetch('http://127.0.0.1:3000'+req.url,{method:req.method,headers,body,redirect:'manual'});
   const responseHeaders=Object.fromEntries([...payload.headers].filter(([name])=>!['content-encoding','content-length','transfer-encoding','set-cookie'].includes(name)));
   const setupCookies=payload.headers.getSetCookie().filter(value=>value.startsWith('__Host-chile3x_browser='));
   res.writeHead(payload.status,{...responseHeaders,...(setupCookies.length?{'set-cookie':setupCookies}:{})});res.end(Buffer.from(await payload.arrayBuffer()));
  }catch{res.writeHead(502);res.end('Local QA upstream unavailable.');}
 }).listen(port,'127.0.0.1',()=>console.log('Local '+role+' preview on '+port));
} else if(mode==='cleanup') {
 const f=JSON.parse(readFileSync(manifest));assert.ok(f.prefix.startsWith('qa_account_'));
 for(const id of f.users)assert.ok(id.startsWith(f.prefix));
 db.exec('BEGIN');for(const id of f.profiles)db.prepare('DELETE FROM profiles WHERE id=?').run(id);db.prepare('DELETE FROM admin_audit_logs WHERE actor_user_id=?').run(f.users[0]);db.prepare('DELETE FROM admin_notifications WHERE actor_user_id IN (SELECT value FROM json_each(?))').run(JSON.stringify(f.users));db.prepare('DELETE FROM admin_github_access WHERE user_id=?').run(f.users[0]);for(const id of f.users)db.prepare('DELETE FROM users WHERE id=?').run(id);
 db.prepare("DELETE FROM site_settings WHERE key LIKE 'mail_%'").run();for(const row of f.settings)db.prepare('INSERT INTO site_settings(key,value,updated_by,updated_at) VALUES(?,?,?,?)').run(row.key,row.value,row.updated_by,row.updated_at);db.exec('COMMIT');db.close();console.log('Removed disposable local fixtures and restored previous local mail configuration.');
} else throw Error('Use seed, serve or cleanup.');
