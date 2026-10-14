// Disposable local fixtures only. No production credentials or remote writes.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const base='http://localhost:3000';
const f=JSON.parse(readFileSync('outputs/qa-media-admin.json','utf8'));
assert.ok(f.prefix.startsWith('qa_media_'));
const file=resolve('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(file.startsWith(resolve('.wrangler/visual-state')+'\\'));
const db=new DatabaseSync(file);
function refresh(){for(const role of ['admin','owner']){const cookie=f[role+'Cookie'],token=cookie.slice(cookie.indexOf('=')+1),[id,secret]=token.split('.');assert.ok(id.startsWith(f.prefix));assert.ok(db.prepare('SELECT id FROM users WHERE id=?').get(f[role]));db.prepare('INSERT INTO auth_sessions(id,user_id,token_hash,auth_method,expires_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET expires_at=excluded.expires_at,auth_method=excluded.auth_method').run(id,f[role],createHash('sha256').update(secret).digest('hex'),role==='admin'?'github':'password',new Date(Date.now()+3600_000).toISOString());}}
const request=(path,cookie,fields,origin=base)=>fetch(base+path,{method:fields?'POST':'GET',headers:{...(cookie?{cookie}:{}),authorization:'qa-local-cache-bypass',...(fields?{origin,accept:'application/json','content-type':'application/x-www-form-urlencoded'}:{})},...(fields?{body:new URLSearchParams(fields)}:{}),redirect:'manual'});
refresh();
try {
 if(process.argv[2]==='refresh'){console.log('Refreshed only the two disposable local credentials.');}
 else if(process.argv[2]==='gallery'){
  for(const type of ['image','image','image','image','image','video','video']){
   const form=new FormData();form.set('upload_kind','gallery');form.set('file',new File([readFileSync(type==='image'?'public/favicon-192.png':'tmp/story-qa-video.mp4')],type==='image'?'qa-icon.png':'qa-clip.mp4',{type:type==='image'?'image/png':'video/mp4'}));
   const result=await fetch(base+`/api/admin/profiles/${f.profileId}/media`,{method:'POST',headers:{cookie:f.adminCookie,origin:base,authorization:'qa-local-cache-bypass'},body:form});assert.equal(result.status,201);
  }console.log('Added only local gallery previews: neutral icons and a generated two-second clip.');
 }
 else {
  const guide={intent:'create',audience:'account',category:'QA',title:'Cambiar una foto QA',summary:'Guía temporal para comprobar el centro de ayuda.',steps:'Abre tus anuncios.\nElige editar y revisa tus fotos.',aliases:'qa,foto',link_href:'/mi-cuenta/anuncios',link_label:'Mis anuncios',link_target:'',capability:'',is_published:'yes'};
  const endpoint='/api/admin/ayuda/guias';
  assert.equal((await request(endpoint,f.ownerCookie,guide)).status,401);
  assert.equal((await request(endpoint,f.adminCookie,guide,'https://other.invalid')).status,403);
  db.prepare("UPDATE admin_github_access SET access_level='support' WHERE user_id=?").run(f.admin);
  assert.equal((await request(endpoint,f.adminCookie,guide)).status,403);
  db.prepare("UPDATE admin_github_access SET access_level='administrator' WHERE user_id=?").run(f.admin);
  let r=await request(endpoint,f.adminCookie,guide);assert.equal(r.status,200);const created=await r.json(),id=new URL(created.redirectTo,base).searchParams.get('id');
  assert.ok(id?.startsWith('help_'));let row=db.prepare('SELECT * FROM help_guides WHERE id=?').get(id);
  assert.ok((await (await request('/mi-cuenta/ayuda',f.ownerCookie)).text()).includes(id));
  r=await request(endpoint,f.adminCookie,{...guide,intent:'update',id,version:row.updated_at,audience:'admin',title:'Guía privada QA',link_href:'/admin/configuracion',capability:'settings.manage'});assert.equal(r.status,200);
  const normal=await (await request('/mi-cuenta/ayuda',f.ownerCookie)).text();assert.ok(!normal.includes(id)&&!normal.includes('Guía privada QA')&&!normal.includes('/admin/configuracion'));
  assert.ok((await (await request('/admin/ayuda',f.adminCookie)).text()).includes(id));
  assert.ok(!(await (await request('/admin/ayuda?audience=account',f.adminCookie)).text()).includes(id));
  assert.equal((await request(endpoint,f.adminCookie,{...guide,intent:'update',id,version:'stale'})).status,409);
  for(const intent of ['delete','restore']){row=db.prepare('SELECT * FROM help_guides WHERE id=?').get(id);assert.equal((await request(endpoint,f.adminCookie,{intent,id,version:row.updated_at})).status,200);assert.equal(db.prepare('SELECT is_deleted FROM help_guides WHERE id=?').get(id).is_deleted,intent==='delete'?1:0);}
  assert.equal(db.prepare("SELECT count(*) n FROM admin_audit_logs WHERE entity_id=? AND action LIKE 'help.guide_%'").get(id).n,4);
  db.prepare('DELETE FROM help_guides WHERE id=?').run(id);
  const flag=db.prepare("SELECT * FROM site_settings WHERE key='account_help_enabled'").get();
  try{db.prepare("INSERT INTO site_settings(key,value) VALUES('account_help_enabled','no') ON CONFLICT(key) DO UPDATE SET value='no'").run();assert.equal((await request('/mi-cuenta/ayuda',f.ownerCookie)).status,404);assert.equal((await request('/admin/ayuda',f.adminCookie)).status,200);}finally{if(flag)db.prepare("UPDATE site_settings SET value=?,updated_at=? WHERE key='account_help_enabled'").run(flag.value,flag.updated_at);else db.prepare("DELETE FROM site_settings WHERE key='account_help_enabled'").run();}
  const user=db.prepare('SELECT * FROM users WHERE id=?').get(f.owner);
  const values={display_name:'Vale QA',full_name:'Valentina Andrea Rojas Díaz',phone:'56912345678',account_region:'Región del Biobío',account_city:'Concepción',birth_date:user.birth_date,username:'a',document_type:'rut',document_number:'invalid',foreign_country:''};
  r=await request('/api/mi-cuenta/datos',f.ownerCookie,values);assert.equal(r.status,200);const partial=await r.json();assert.ok(partial.updated.includes('displayName')&&partial.updated.includes('fullName')&&partial.updated.includes('phone'));assert.ok(partial.errors.includes('username_invalid')&&partial.errors.includes('document'));
  assert.equal(db.prepare('SELECT display_name FROM users WHERE id=?').get(f.owner).display_name,'Vale QA');
  r=await request('/api/mi-cuenta/datos',f.ownerCookie,{...values,display_name:'Segundo nombre QA',username:user.username,document_number:'',birth_date:'2020-01-01'});const protectedDate=await r.json();assert.ok(protectedDate.errors.includes('birthDate'));assert.ok(protectedDate.updated.includes('displayName'));assert.equal(db.prepare('SELECT birth_date FROM users WHERE id=?').get(f.owner).birth_date,user.birth_date);
  assert.equal((await request('/api/mi-cuenta/datos',f.adminCookie,values)).status,401);
  assert.equal((await request('/api/mi-cuenta/datos',f.ownerCookie,values,'https://other.invalid')).status,403);
  db.prepare('UPDATE users SET display_name=?,first_name=?,last_name=?,phone=?,document_type=?,document_number=?,foreign_country=? WHERE id=?').run(user.display_name,user.first_name,user.last_name,user.phone,user.document_type,user.document_number,user.foreign_country,f.owner);
  const normalOnly=await request('/admin/anuncios-publicaciones',f.ownerCookie);assert.ok([303,307].includes(normalOnly.status));
  const mixed=await request('/api/mi-cuenta/datos',f.ownerCookie+'; '+f.adminCookie,values);assert.equal(mixed.status,409);assert.equal((await mixed.json()).error,'session_conflict');
  assert.equal(db.prepare('SELECT count(*) n FROM auth_sessions WHERE user_id IN (?,?)').get(f.owner,f.admin).n,0);
  refresh();console.log('PASS: help CRUD, stale updates, audience isolation, disable flag, partial account saves, protected DOB, role/CSRF and real mixed-cookie Worker gate.');
 }
}finally{db.close();}
