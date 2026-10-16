// Disposable local UI fixtures, never remote. Run after qa-account-moderation seed/extend.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve('.wrangler/visual-state');
const path=resolve(root,'v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(path.startsWith(root+'\\'));
const db=new DatabaseSync(path);db.exec('PRAGMA foreign_keys=ON');
const manifest='outputs/qa-account-moderation.json',f=JSON.parse(readFileSync(manifest,'utf8'));
assert.match(f.prefix,/^qa_account_[a-f0-9]+$/);
if(process.argv[2]==='seed'){
 assert.equal(f.legalSnapshot,undefined);
 f.legalSnapshot=db.prepare('SELECT * FROM legal_documents').all();f.legalVersionsSnapshot=db.prepare('SELECT * FROM legal_document_versions').all();
 db.exec('BEGIN');
 for(const suffix of ['agency','rental','rental2'])db.prepare('DELETE FROM profiles WHERE id=?').run(f.prefix+'_'+suffix);
 for(const id of f.profiles)db.prepare('DELETE FROM profile_views WHERE profile_id=?').run(id);
 // The first page is the source. Others exercise all three listing types and content-only.
 for(const id of f.profiles.slice(0,3))db.prepare('UPDATE profiles SET is_demo=0 WHERE id=?').run(id);
 for(const [suffix,type,name] of [['agency','agency','Agencia local QA'],['rental','rental','Arriendo local QA'],['rental2','rental','Espacio local QA']]){
  const id=f.prefix+'_'+suffix;f.profiles.push(id);db.prepare("INSERT INTO profiles(id,owner_id,type,status,slug,handle,display_name,short_description,description,region,city,tier,is_demo) VALUES(?,?,?,'approved',?,?,?,'Prueba local','Perfil ficticio local, sin oferta real.','Región del Biobío','Concepción','bronze',0)").run(id,f.users[1],type,id,id,name);
 }
 for(const [index,id] of f.profiles.filter(id=>!id.endsWith('_p4')).entries()){
  for(let n=0;n<7-index;n++)db.prepare("INSERT INTO profile_views(id,profile_id,viewer_key,viewed_on,viewed_at) VALUES(?,?,?,date('now'),datetime('now','-1 hour'))").run(f.prefix+'_v'+index+'_'+n,id,f.prefix+'_viewer'+n);
  db.prepare("INSERT INTO profile_media(id,profile_id,r2_key,media_type,visibility,moderation_status,content_type,byte_size,is_profile_photo,sort_order) VALUES(?,?,?,'image','public','approved','image/webp',12862,1,0)").run(f.prefix+'_cover'+index,id,'qa-local-legal-cover.webp');
 }
 db.exec('COMMIT');
 writeFileSync(manifest,JSON.stringify(f));console.log('Local legal snapshots and city ranking fixtures ready.');console.log('Local source: http://127.0.0.1:3001/perfil/@'+f.profiles[0]);
}else if(process.argv[2]==='verify'){
 const a='http://127.0.0.1:3002',b='http://127.0.0.1:3005',owner='http://127.0.0.1:3001',endpoint='/api/admin/documentos-legales/privacy';
 const state=await (await fetch(a+endpoint)).json();assert.ok(state.document);const document=structuredClone(state.document);document.description='Descripción SEO de prueba local, nunca publicada en producción.';
 const body={intent:'draft',document,review_key:'legal:privacy',review_revision:String(state.revision)};
 const send=(origin,payload)=>fetch(origin+endpoint,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(payload)});
 assert.equal((await send(a,body)).status,200);const conflict=await send(b,body);assert.equal(conflict.status,409);assert.equal((await conflict.json()).conflict,true);
 assert.equal((await fetch(owner+endpoint)).status,401);assert.equal((await send(owner,body)).status,401);
 const publicDraft=await (await fetch(owner+'/privacidad')).text();assert.ok(!publicDraft.includes(document.description));
 const saved=await (await fetch(a+endpoint)).json();const published=await send(a,{...body,intent:'publish',confirm:true,review_revision:String(saved.revision)});assert.equal(published.status,200);
 const publicHtml=await (await fetch(owner+'/privacidad')).text();assert.ok(publicHtml.includes(document.description));assert.match(publicHtml,/<link[^>]+rel="canonical"[^>]+https:\/\/chile3x.cl\/privacidad/);assert.equal((publicHtml.match(/<h1(?:\s|>)/g)??[]).length,1);
 const source=await (await fetch(owner+'/perfil/@'+f.profiles[0])).text();assert.equal((source.match(/class="city-popular-card"/g)??[]).length,5);assert.match(source,/loading="lazy"[^>]+fetchPriority="low"|fetchPriority="low"[^>]+loading="lazy"/i);assert.equal((source.match(/<h1(?:\s|>)/g)??[]).length,1);assert.match(source,/Los más vistos/);
 console.log('HTTP verified: draft privacy, publish/metadata, admin conflict 409, normal-user denial 401, five lazy server-rendered links and single H1.');
}else if(process.argv[2]==='restore'){
 assert.ok(f.legalSnapshot);db.exec('BEGIN');db.exec('DELETE FROM legal_document_versions');
 for(const row of f.legalVersionsSnapshot)db.prepare('INSERT INTO legal_document_versions(id,document_id,version,document_json,published_at,published_by) VALUES(?,?,?,?,?,?)').run(row.id,row.document_id,row.version,row.document_json,row.published_at,row.published_by);
 for(const row of f.legalSnapshot)db.prepare('UPDATE legal_documents SET published_json=?,draft_json=?,version=?,published_at=?,updated_by=?,updated_at=?,revision=? WHERE id=?').run(row.published_json,row.draft_json,row.version,row.published_at,row.updated_by,row.updated_at,row.revision,row.id);
 for(const id of f.users)db.prepare('DELETE FROM review_reservations WHERE actor_id=?').run(id);
 db.exec('COMMIT');console.log('Previous local legal documents restored.');
}else throw Error('Use seed or restore.');
db.close();
