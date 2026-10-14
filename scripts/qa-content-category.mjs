// Disposable local-only fixtures and full API → D1 → public HTML verification.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base='http://localhost:3000';
const fixture=JSON.parse(readFileSync('outputs/qa-media-admin.json','utf8'));
assert.ok(fixture.prefix.startsWith('qa_media_'));
const database=resolve('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(database.startsWith(resolve('.wrangler/visual-state')+'\\'));
const db=new DatabaseSync(database);db.exec('PRAGMA foreign_keys=ON');
const manifest='outputs/qa-content-category.json';
try {
 if(process.argv[2]==='cleanup') {
  const data=JSON.parse(readFileSync(manifest,'utf8'));
  assert.equal(data.prefix,fixture.prefix);
  for(const id of data.profiles) { assert.ok(db.prepare('SELECT owner_id FROM profiles WHERE id=?').get(id)?.owner_id.startsWith(fixture.prefix));db.prepare('DELETE FROM profiles WHERE id=?').run(id); }
  for(const id of data.users) { assert.ok(id.startsWith(fixture.prefix));db.prepare('DELETE FROM users WHERE id=?').run(id); }
  console.log('Removed only disposable local category fixtures; production untouched.');
 } else {
  const payload=only=>{const form=new FormData();for(const [key,value] of Object.entries({type:'escort',tier:'vip',handle:fixture.prefix.replaceAll('_','-'),display_name:'QA Contenido mixto',region:'Región del Biobío',city:'Concepción',short_description:'Perfil ficticio local',description:'Perfil de prueba local, sin oferta real.',contact_whatsapp:'56912345678',gender:'Femenino',age:'25',intent:'submit',...(only?{content_only:'on'}:{})}))form.set(key,value);for(const tag of ['milf','hombres','masajes','venta-contenido'])form.append('tags',tag);form.append('services_included','Videollamada');form.append('services_additional','Traslado');form.set('price_60_min','50000');return form;};
  const save=async(admin,only)=>{const result=await fetch(`${base}/api/${admin?'admin/profiles':'perfiles'}/${fixture.profileId}${admin?'/editar':''}`,{method:'POST',headers:{cookie:admin?fixture.adminCookie:fixture.ownerCookie,origin:base},body:payload(only),redirect:'manual'});assert.equal(result.status,303);assert.doesNotMatch(result.headers.get('location'),/error=/);};
  await save(true,true);
  assert.equal(db.prepare('SELECT status FROM profiles WHERE id=?').get(fixture.profileId).status,'approved');
  assert.equal(JSON.parse(db.prepare('SELECT metadata FROM profile_details WHERE profile_id=?').get(fixture.profileId).metadata).content_only,'1');
  assert.equal(db.prepare('SELECT count(*) n FROM profile_services WHERE profile_id=?').get(fixture.profileId).n,0);
  assert.equal(db.prepare("SELECT count(*) n FROM profile_tags WHERE profile_id=? AND tag='masajes'").get(fixture.profileId).n,0);
  const onlyHtml=await (await fetch(`${base}/perfil/@${fixture.prefix.replaceAll('_','-')}`)).text();
  assert.match(onlyHtml,/venta de contenido en Concepción/);assert.doesNotMatch(onlyHtml,/>ESCORT · CONCEPCIÓN</);
  await save(false,false);
  assert.equal(db.prepare('SELECT status FROM profiles WHERE id=?').get(fixture.profileId).status,'pending','owner changes still need moderation');
  assert.equal(JSON.parse(db.prepare('SELECT metadata FROM profile_details WHERE profile_id=?').get(fixture.profileId).metadata).content_only,undefined);
  db.prepare("UPDATE profiles SET status='approved',is_demo=1,is_featured=1 WHERE id=?").run(fixture.profileId);
  const data={prefix:fixture.prefix,profiles:[],users:[]};writeFileSync(manifest,JSON.stringify(data));
  for(let i=0;i<53;i++) {
   const user=`${fixture.prefix}_content_user_${i}`,id=`prf_${randomUUID()}`,handle=`${fixture.prefix.replaceAll('_','-')}-content-${i}`;
   const type=i===51?'agency':i===52?'rental':'escort';
   const only=i===0,tier=['vip','premium','bronze'][i%3];
   db.prepare('INSERT INTO users(id,email,display_name,is_active,email_verified_at) VALUES(?,?,?,?,?)').run(user,`${user}@example.invalid`,'QA local',1,new Date().toISOString());
   db.prepare('INSERT INTO profiles(id,owner_id,type,status,slug,handle,display_name,short_description,description,region,city,tier,is_demo) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,user,type,'approved',handle,handle,only?'QA Contenido exclusivo':`QA rotación ${i}`,'Perfil ficticio local','Anuncio de prueba local, sin oferta real.','Región del Biobío','Concepción',tier,1);
   db.prepare('INSERT INTO profile_details(profile_id,metadata) VALUES(?,?)').run(id,JSON.stringify({gender:'Femenino',age:'27',...(only?{content_only:'1'}:{})}));
   if(only||i===1)db.prepare('INSERT INTO profile_tags(id,profile_id,tag) VALUES(?,?,?)').run(`tag_${randomUUID()}`,id,'venta-contenido');
   data.profiles.push(id);data.users.push(user);if(only)data.onlyHandle=handle;
   writeFileSync(manifest,JSON.stringify(data));
  }
  const get=async path=>{const res=await fetch(base+path);assert.equal(res.status,200,path);return res.text();};
  const content=await get('/escorts/concepcion?categoria=contenido&orden=12345');
  assert.match(content,/QA Contenido exclusivo/);assert.match(content,/QA Contenido mixto/);
  const vip=await get('/escorts/concepcion?categoria=vip&orden=12345');
  assert.doesNotMatch(vip,/QA Contenido exclusivo/);assert.match(vip,/QA Contenido mixto/);
  const massages=await get('/escorts/concepcion?categoria=masajes&orden=12345');
  assert.doesNotMatch(massages,/QA Contenido exclusivo/);assert.match(massages,/QA Contenido mixto/);
  const all1=await get('/escorts/concepcion?orden=12345'),all2=await get('/escorts/concepcion?orden=12345&pagina=2'),all3=await get('/escorts/concepcion?orden=12345&pagina=3');
  const handles=html=>[...new Set([...html.matchAll(/class="public-profile-visual[^>]+href="([^\"]+)"|href="([^\"]+)" class="public-profile-visual/g)].map(m=>m[1]||m[2]))];
  const pages=[handles(all1),handles(all2),handles(all3)];
  assert.equal(pages[0].length,24);assert.equal(pages[1].length,24);assert.equal(new Set(pages.flat()).size,pages.flat().length,'pagination must not duplicate listings');
  assert.match(all1,/orden=12345/);
  const changed=await get('/escorts/concepcion?orden=54321');assert.notDeepEqual(handles(changed),pages[0]);
  console.log('PASS: admin and owner editing, moderation preserved, content-only normalized, mixed categories, semantic SEO, seeded pages and rotation. Local fixtures only.');
 }
} finally { db.close(); }
