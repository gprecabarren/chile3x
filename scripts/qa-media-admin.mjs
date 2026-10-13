// Local-only fixtures and integration checks for media QA. Never uses remote D1.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base='http://localhost:3000';
const database=resolve('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(database.startsWith(resolve('.wrangler/visual-state')+'\\') || database.startsWith(resolve('.wrangler/visual-state')+'/'));
const db=new DatabaseSync(database);
db.exec('PRAGMA foreign_keys=ON');
const manifest='outputs/qa-media-admin.json';
if(process.argv[2]==='cleanup'){
  const fixtures=JSON.parse(readFileSync(manifest,'utf8'));
  assert.ok(fixtures.prefix.startsWith('qa_media_'));
  const ids=[fixtures.admin,fixtures.owner];
  db.prepare('DELETE FROM admin_audit_logs WHERE actor_user_id IN (?,?)').run(...ids);
  db.prepare('DELETE FROM admin_github_access WHERE user_id=?').run(fixtures.admin);
  db.prepare('DELETE FROM profiles WHERE id=?').run(fixtures.profileId);
  for(const id of ids) db.prepare('DELETE FROM users WHERE id=?').run(id);
  console.log('Removed only local media QA accounts, listings, audits and library rows.');
  process.exit(0);
}
if(process.argv[2]==='verify'){
  const fixtures=JSON.parse(readFileSync(manifest,'utf8'));
  const cookie=fixtures.adminCookie;
  const request=(path,body,origin=base)=>fetch(base+path,{method:'POST',headers:{cookie,origin},body,redirect:'manual'});
  const files=db.prepare('SELECT * FROM exclusive_content_media WHERE collection_id=?').all(fixtures.collectionId);
  const version=async f=>createHash('sha256').update(JSON.stringify([f.id,f.r2_key,f.byte_size,f.created_at,f.moderation_status,false])).digest('hex');
  const snapshot=await Promise.all(files.map(async f=>({id:f.id,version:await version(f)})));
  const makeBody=()=>{const body=new FormData();body.set('return_to','/admin/medios?tipo=exclusive');body.set('review_confirmed','yes');body.set('reviewed_media',JSON.stringify(snapshot));return body;};
  const url=`/api/admin/contenido/colecciones/${fixtures.collectionId}/aprobar-todos`;
  assert.equal((await request(url,makeBody(),'https://other.invalid')).status,403);
  const missing=makeBody();missing.delete('review_confirmed');assert.equal((await request(url,missing)).status,400);
  // A reviewed replacement must invalidate the entire batch, not just that file.
  const oldKey=files[0].r2_key;db.prepare('UPDATE exclusive_content_media SET r2_key=? WHERE id=?').run(oldKey+'-replacement',files[0].id);
  const stale=await request(url,makeBody());assert.equal(stale.status,303);assert.ok(stale.headers.get('location').includes('media_notice=changed'));
  assert.equal(db.prepare("SELECT count(*) AS n FROM exclusive_content_media WHERE collection_id=? AND moderation_status='approved'").get(fixtures.collectionId).n,0);
  db.prepare('UPDATE exclusive_content_media SET r2_key=? WHERE id=?').run(oldKey,files[0].id);
  const approved=await request(url,makeBody());assert.equal(approved.status,303);assert.ok(approved.headers.get('location').includes('media_notice=exclusive_approved'));
  assert.equal(db.prepare("SELECT count(*) AS n FROM exclusive_content_media WHERE collection_id=? AND moderation_status='approved'").get(fixtures.collectionId).n,files.length);
  const audit=db.prepare("SELECT * FROM admin_audit_logs WHERE action='media.exclusive_bulk_approve' AND actor_user_id=?").get(fixtures.admin);
  assert.ok(audit);assert.equal(audit.actor_github_login,fixtures.github);assert.equal(JSON.parse(audit.after_data).approvedIds.length,files.length);
  assert.equal(db.prepare('SELECT status FROM profiles WHERE id=?').get(fixtures.profileId).status,'approved');
  assert.equal(db.prepare('SELECT count(*) AS n FROM exclusive_content_access WHERE collection_id=?').get(fixtures.collectionId).n,0);
  const repeated=await request(url,makeBody());assert.ok(repeated.headers.get('location').includes('media_notice=changed'));
  const freshFiles=db.prepare('SELECT * FROM exclusive_content_media WHERE collection_id=?').all(fixtures.collectionId);
  const fresh=makeBody();fresh.set('reviewed_media',JSON.stringify(await Promise.all(freshFiles.map(async f=>({id:f.id,version:await version(f)})))));
  assert.ok((await request(url,fresh)).headers.get('location').includes('media_notice=unchanged'));
  const home=await (await fetch(base+'/admin',{headers:{cookie}})).text();assert.ok(home.includes('Últimos 10 movimientos'));assert.ok(home.includes(fixtures.github));
  console.log(`PASS: ${files.length} exclusive files approved atomically; actor/audit, CSRF, stale snapshots, privacy, listing status and idempotence verified.`);
  process.exit(0);
}
const suffix=randomBytes(5).toString('hex'), prefix=`qa_media_${suffix}`;
const fixtures={prefix,admin:`${prefix}_admin`,owner:`${prefix}_owner`,profileId:`${prefix}_profile`,collectionId:`${prefix}_collection`,github:`qa-media-${suffix}`};
for(const [name,id] of [['admin',fixtures.admin],['owner',fixtures.owner]]){
  db.prepare('INSERT INTO users(id,email,username,display_name,role,is_active,email_verified_at,city) VALUES(?,?,?,?,?,1,?,?)').run(id,`${id}@example.invalid`,id,`QA ${name}`,name==='admin'?'admin':'advertiser',new Date().toISOString(),'Concepción');
  const secret=randomBytes(24).toString('hex'),session=`${prefix}_${name}_session`;
  db.prepare('INSERT INTO auth_sessions(id,user_id,token_hash,auth_method,expires_at) VALUES(?,?,?,?,?)').run(session,id,createHash('sha256').update(secret).digest('hex'),name==='admin'?'github':'password',new Date(Date.now()+3600_000).toISOString());
  fixtures[`${name}Cookie`]=`${name==='admin'?'chile3x_admin_session':'chile3x_user_session'}=${session}.${secret}`;
}
db.prepare('INSERT INTO admin_github_access(id,github_login,user_id,access_level,is_active) VALUES(?,?,?,?,1)').run(`${prefix}_grant`,fixtures.github,fixtures.admin,'administrator');
db.prepare('INSERT INTO profiles(id,owner_id,type,status,slug,handle,display_name,region,city) VALUES(?,?,?,?,?,?,?,?,?)').run(fixtures.profileId,fixtures.owner,'escort','approved',prefix,prefix,'Prueba local de medios','Región del Biobío','Concepción');
db.prepare('INSERT INTO exclusive_content_collections(id,owner_id,profile_id) VALUES(?,?,?)').run(fixtures.collectionId,fixtures.owner,fixtures.profileId);
// Complete maximum library: the approval must cover all 24, not stop at 20.
for(let i=0;i<24;i++) db.prepare('INSERT INTO exclusive_content_media(id,collection_id,media_type,r2_key,moderation_status) VALUES(?,?,?,?,?)').run(`${prefix}_exclusive_${i}`,fixtures.collectionId,i<20?'image':'video',`qa-only/${prefix}/${i}`, 'pending');
writeFileSync(manifest,JSON.stringify(fixtures));
console.log(`Local fixtures ready: ${fixtures.profileId}.`);
