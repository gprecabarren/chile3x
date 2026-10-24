// Disposable loopback data only. Never prints invitations, session cookies or tokens.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const base='http://127.0.0.1:3880';
assert.equal(new URL(base).hostname,'127.0.0.1');
const fixture=JSON.parse(readFileSync('outputs/qa-account-stories.json','utf8'));
assert.match(fixture.prefix,/^qa_stories_[a-f0-9]+$/);
const root=resolve('.wrangler/visual-state');
const dbPath=resolve(root,'v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(dbPath.startsWith(root+'\\')||dbPath.startsWith(root+'/'));
const db=new DatabaseSync(dbPath);
const adminId=fixture.prefix+'_admin',targetId=fixture.prefix+'_empty';
const row=id=>db.prepare('SELECT * FROM private_profile_samples WHERE id=? AND created_by=?').get(id,adminId);
const anonymous=fixture.cookies.empty.split('; ').filter(v=>v.startsWith('__Host-chile3x_browser=')).join('; ');
async function request(path,{role='admin',cookie,headers={},...options}={}){
 const authCookie=cookie??(role==='anonymous'?anonymous:fixture.cookies[role]);
 const result=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(30000),...options,headers:{connection:'close',cookie:authCookie??'',origin:base,accept:'application/json',...headers}});
 const response={status:result.status,headers:result.headers,text:await result.text()};
 if(options.method==='POST'&&[401,403].includes(response.status))await fetch(base+'/api/auth/session/state',{headers:{connection:'close',cookie:authCookie??''},signal:AbortSignal.timeout(30000)}).then(r=>r.arrayBuffer());
 return response;
}
const input=(label='Principal')=>new URLSearchParams({sample_permission:'on',type:'escort',tier:'bronze',handle:fixture.prefix+'_'+label.toLowerCase(),display_name:'QA presentación '+label,region:'Región del Biobío',city:'Concepción',short_description:'Comprobación técnica local.',description:'Datos ficticios desechables para verificar el flujo técnico privado.',contact_whatsapp:'56911111111',gender:'Femenino',age:'25',promotions:'Texto de prueba. '.repeat(25)});
const mutate=(id,action,extra={},revision=row(id).revision)=>request('/api/admin/muestras/'+id,{method:'POST',body:new URLSearchParams({review_key:'sample:'+id,review_revision:String(revision),sample_action:action,...extra})});
async function create(label){const existing=db.prepare('SELECT id FROM private_profile_samples WHERE display_name=? AND created_by=? AND migrated_at IS NULL').get('QA presentación '+label,adminId);if(existing)return existing.id;const r=await request('/api/admin/muestras',{method:'POST',body:input(label)});assert.equal(r.status,200,r.text);const id=new URL(JSON.parse(r.text).redirectTo).pathname.split('/').at(-1);assert.match(id,/^sam_[a-f0-9-]{36}$/);assert.ok(row(id));return id;}
async function upload(id,valid=true){const body=new FormData();for(const [k,v] of Object.entries({review_key:'sample:'+id,review_revision:String(row(id).revision),sample_action:'upload',cover:'on'}))body.set(k,v);body.set('file',new Blob([valid?readFileSync('public/chile3x-favicon-192-20261020.png'):Buffer.from('not a PNG')],{type:'image/png'}),'qa.png');return request('/api/admin/muestras/'+id,{method:'POST',body});}
async function share(id){const r=await mutate(id,'share');assert.equal(r.status,200,r.text);const data=JSON.parse(r.text),url=new URL(data.url);assert.equal(url.origin,base);assert.equal(url.pathname,'/muestra/'+id);assert.equal(url.search,'');assert.match(url.hash,/^#[a-f0-9]{64}$/);return {token:url.hash.slice(1),revision:data.revision};}
async function exchange(id,token){return request('/muestra/'+id+'/acceso',{role:'anonymous',method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});}
let main,aux;
if(process.argv[2]==='cleanup'){
 const samples=db.prepare('SELECT id,migrated_profile_id FROM private_profile_samples WHERE created_by=?').all(adminId);
 const keys=new Set();
 for(const sample of samples){
  assert.match(sample.id,/^sam_[a-f0-9-]{36}$/);
  for(const file of db.prepare('SELECT r2_key FROM private_sample_media WHERE sample_id=?').all(sample.id))keys.add(file.r2_key);
  if(sample.migrated_profile_id){
   const profile=db.prepare('SELECT owner_id FROM profiles WHERE id=?').get(sample.migrated_profile_id);assert.ok(profile?.owner_id.startsWith(fixture.prefix+'_'));
   for(const file of db.prepare('SELECT r2_key FROM profile_media WHERE profile_id=?').all(sample.migrated_profile_id))keys.add(file.r2_key);
   db.exec('PRAGMA foreign_keys=ON;');db.prepare('DELETE FROM profiles WHERE id=? AND owner_id=?').run(sample.migrated_profile_id,profile.owner_id);
  }
  const removed=await mutate(sample.id,'delete',{confirmation:'ELIMINAR'});assert.equal(removed.status,200,removed.text);
 }
 for(const key of keys){assert.ok(samples.some(sample=>key.startsWith('private-samples/'+sample.id+'/')));const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','delete','chile3x-media/'+key,'--local','--persist-to',root],{encoding:'utf8'});assert.equal(result.status,0,'Could not remove a disposable local R2 object.');db.prepare('DELETE FROM data_deletion_jobs WHERE r2_key=?').run(key);}
 assert.equal(db.prepare('SELECT count(*) n FROM private_profile_samples WHERE created_by=?').get(adminId).n,0);
 db.close();console.log('PASS removed only disposable local samples, their converted listings and R2 files.');process.exit(0);
}
try{
 const count=db.prepare('SELECT (SELECT count(*) FROM users) users,(SELECT count(*) FROM profiles) profiles').get();
 for(const role of ['owner','anonymous'])assert.ok([401,403,409].includes((await request('/api/admin/muestras',{role,method:'POST',body:input()})).status));
 assert.equal((await request('/api/admin/muestras',{method:'POST',body:input(),headers:{origin:'https://attacker.invalid'}})).status,403);
 const noPermission=input();noPermission.delete('sample_permission');assert.equal((await request('/api/admin/muestras',{method:'POST',body:noPermission})).status,400);
 const badTags=input();badTags.append('tags','milf');badTags.append('tags','hombres');assert.equal((await request('/api/admin/muestras',{method:'POST',body:badTags})).status,400);
 main=await create('Principal');aux=await create('Auxiliar');
 assert.deepEqual(db.prepare('SELECT (SELECT count(*) FROM users) users,(SELECT count(*) FROM profiles) profiles').get(),count);
 assert.equal(JSON.parse(row(main).form_json).find(([k])=>k==='promotions')[1],input().get('promotions'));
 const adminPage=await request('/admin/muestras/'+main);assert.equal(adminPage.status,200);assert.match(adminPage.headers.get('x-robots-tag'),/noindex/);assert.doesNotMatch(adminPage.text,/\d+:E\{/);
 const withoutPhoto=await mutate(aux,'migrate',{owner_email:targetId+'@example.invalid',acceptance:'on'});assert.equal(withoutPhoto.status,400,withoutPhoto.text);
 assert.equal((await upload(main,false)).status,400);assert.equal((await upload(main)).status,200);
 const file=db.prepare('SELECT * FROM private_sample_media WHERE sample_id=?').get(main);assert.ok(file);assert.equal(file.is_profile_photo,1);
 console.log('PASS admin-only creation, consent, tag validation, full text preservation, private media upload and no real account/listing created.');

 const pagePath='/muestra/'+main,filePath=pagePath+'/archivo/'+file.id;
 const denied=await request(pagePath,{role:'anonymous'});assert.equal(denied.status,200);assert.ok(!denied.text.includes('QA presentación Principal'));assert.match(denied.headers.get('cache-control'),/no-store/);assert.match(denied.headers.get('x-robots-tag'),/noindex/);assert.doesNotMatch(denied.text,/<link rel="canonical"/);
 assert.equal((await request(filePath,{role:'anonymous'})).status,404);
 const first=await share(main);assert.equal(row(main).token_hash,createHash('sha256').update(first.token).digest('hex'));assert.ok(!JSON.stringify(row(main)).includes(first.token));
 const opened=await exchange(main,first.token);assert.equal(opened.status,200);const cookie=opened.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Lax/);assert.ok(cookie.includes('Path='+pagePath));
 const recipient=cookie.split(';')[0];
 const preview=await request(pagePath,{cookie:recipient});assert.equal(preview.status,200);assert.ok(preview.text.includes('QA presentación Principal'));assert.match(preview.headers.get('referrer-policy'),/no-referrer/);assert.doesNotMatch(preview.text,/\d+:E\{|application\/ld\+json|googletagmanager.com\/gtag|portal-load-recovery-bootstrap/);
 assert.ok(!preview.text.includes(first.token));assert.doesNotMatch(preview.text,/<link rel="canonical"/);
 const bytes=await request(filePath,{cookie:recipient,headers:{range:'bytes=0-7'}});assert.equal(bytes.status,206);assert.match(bytes.headers.get('content-range'),/^bytes 0-7\//);
 assert.equal((await request(filePath,{cookie:recipient,headers:{range:'bytes=999999999-'}})).status,416);
 assert.equal((await mutate(main,'share',{},first.revision-1)).status,409);
 const second=await share(main);assert.notEqual(second.token,first.token);assert.equal((await exchange(main,first.token)).status,401);assert.equal((await request(filePath,{cookie:recipient})).status,404);
 const secondOpen=await exchange(main,second.token);assert.equal(secondOpen.status,200);
 assert.equal((await mutate(main,'revoke')).status,200);assert.equal((await exchange(main,second.token)).status,401);
 const expired=await share(main);db.prepare('UPDATE private_profile_samples SET expires_at=? WHERE id=? AND created_by=?').run(Date.now()-1000,main,adminId);assert.equal((await exchange(main,expired.token)).status,401);
 await share(main);
 console.log('PASS secret fragment/hash, no unauthorized HTML/media, private cache/CSP/metadata, byte ranges, stale edits, rotation, revocation and expiration.');

 assert.equal((await mutate(main,'migrate',{owner_email:targetId+'@example.invalid'})).status,400);
 assert.equal((await mutate(main,'migrate',{owner_email:adminId+'@example.invalid',acceptance:'on'})).status,400);
 assert.equal((await mutate(main,'migrate',{owner_email:fixture.prefix+'_owner@example.invalid',acceptance:'on'})).status,409);
 assert.ok(!row(main).migrated_at);assert.equal(db.prepare('SELECT count(*) n FROM private_sample_media WHERE sample_id=?').get(main).n,1);
 const original=db.prepare('SELECT email_verified_at,email_verification_exempt_at,is_active FROM users WHERE id=?').get(targetId);
 try{
  db.prepare('UPDATE users SET email_verified_at=NULL,email_verification_exempt_at=NULL WHERE id=?').run(targetId);
  assert.equal((await mutate(main,'migrate',{owner_email:targetId+'@example.invalid',acceptance:'on'})).status,400);
 }finally{db.prepare('UPDATE users SET email_verified_at=?,email_verification_exempt_at=?,is_active=? WHERE id=?').run(original.email_verified_at,original.email_verification_exempt_at,original.is_active,targetId);}
 const oldVersion=row(main).revision,migrated=await mutate(main,'migrate',{owner_email:targetId+'@example.invalid',acceptance:'on'});assert.equal(migrated.status,200,migrated.text);
 const migratedId=row(main).migrated_profile_id;assert.ok(migratedId);assert.ok(JSON.parse(migrated.text).redirectTo.includes(migratedId));
 const real=db.prepare('SELECT * FROM profiles WHERE id=? AND owner_id=?').get(migratedId,targetId);assert.ok(real);assert.equal(real.status,'approved');assert.equal(real.verification_status,'unreviewed');assert.equal(real.health_review_status,'not_requested');
 assert.equal(db.prepare('SELECT r2_key FROM profile_media WHERE profile_id=?').get(migratedId).r2_key,file.r2_key);assert.equal(db.prepare('SELECT count(*) n FROM private_sample_media WHERE sample_id=?').get(main).n,0);
 assert.equal(row(main).token_hash,null);assert.equal(row(main).form_json,'[]');assert.equal((await request(filePath,{cookie:recipient})).status,404);
 assert.equal((await mutate(main,'migrate',{owner_email:targetId+'@example.invalid',acceptance:'on'},oldVersion)).status,409);
 assert.equal(db.prepare('SELECT count(*) n FROM profiles WHERE owner_id=?').get(targetId).n,1);assert.equal(db.prepare('SELECT count(*) n FROM users').get().n,count.users);
 assert.equal((await mutate(aux,'delete',{confirmation:'WRONG'})).status,400);
 console.log('PASS atomic conversion, verified active owner, no replacement, one-listing limit, shared files without copies, no false verification and no duplicate retry.');
 console.log('PASS local samples retained for visual QA; cleanup selects only records owned by the disposable fixture administrator.');
}finally{db.close();}
