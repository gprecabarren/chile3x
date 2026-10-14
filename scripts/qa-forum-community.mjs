// All records, identities and uploads below are disposable LOCAL fixtures.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash,randomBytes } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const base='http://localhost:3000',manifest='outputs/qa-media-admin.json',f=JSON.parse(readFileSync(manifest,'utf8'));
assert.ok(f.prefix.startsWith('qa_media_'));
const db=new DatabaseSync(resolve('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite'));db.exec('PRAGMA foreign_keys=ON');
const reset=(user=f.admin,kind)=>{for(const name of kind?[kind]:['write','publish','upload','report'])db.prepare('DELETE FROM forum_rate_limits WHERE key=?').run(`${user}:${name}`);};
const rules=()=>db.prepare("SELECT * FROM forum_settings WHERE id='global'").get();
const ack=()=>({rules_version:rules().version,rules_ack:'yes'});
const request=(path,cookie=f.adminCookie,options={})=>fetch(base+path,{...options,headers:{authorization:'qa-local-cache-bypass',...(cookie?{cookie}:{}),...(options.headers??{})},redirect:'manual'});
const send=(fields,cookie=f.adminCookie)=>request('/api/admin/foro',cookie,{method:'POST',headers:{origin:base,accept:'application/json','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields)});
const post=id=>db.prepare('SELECT * FROM forum_posts WHERE id=?').get(id);
const attachment=id=>db.prepare('SELECT * FROM forum_attachments WHERE id=?').get(id);
async function saved(fields,cookie=f.adminCookie){reset(cookie===f.adminCookie?f.admin:f.secondAdmin);const res=await send(fields,cookie);const body=await res.json();assert.equal(res.status,200,JSON.stringify(body));return body.redirectTo;}
async function upload(bytes,type='image/png',changes={},cookie=f.adminCookie,postId=f.forumPostId){reset(cookie===f.adminCookie?f.admin:f.secondAdmin);const data=new FormData();for(const [key,value] of Object.entries({consent:'yes',...ack(),...changes}))data.set(key,value);data.set('file',new File([bytes],`qa.${type.includes('video')?'mp4':'png'}`,{type}));const res=await request(`/api/admin/foro/adjuntos/${postId}`,cookie,{method:'POST',headers:{origin:base},body:data});const body=await res.json();return {status:res.status,body};}
try{
 if(process.argv[2]==='cleanup'){
  const files=db.prepare('SELECT a.id,a.r2_key FROM forum_attachments a JOIN forum_posts p ON p.id=a.post_id WHERE p.topic_id IN (SELECT id FROM forum_topics WHERE section_id=?)').all(f.forumSectionId);
  for(const file of files){assert.ok(file.r2_key.startsWith('forum/'));assert.ok(post(db.prepare('SELECT post_id FROM forum_attachments WHERE id=?').get(file.id).post_id).topic_id.startsWith('ftopic_')||file.r2_key.includes(f.prefix));
   execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','delete',`chile3x-media/${file.r2_key}`,'--local','--persist-to','.wrangler/visual-state'],{stdio:'pipe'});
  }
  db.prepare('DELETE FROM forum_posts WHERE topic_id IN (SELECT id FROM forum_topics WHERE section_id=?)').run(f.forumSectionId);db.prepare('DELETE FROM forum_topics WHERE section_id=?').run(f.forumSectionId);
  for(const user of [f.admin,f.secondAdmin].filter(Boolean)){reset(user);db.prepare('DELETE FROM forum_rule_acceptances WHERE user_id=?').run(user);}
  if(f.secondAdmin){db.prepare('DELETE FROM admin_audit_logs WHERE actor_user_id=?').run(f.secondAdmin);db.prepare('DELETE FROM admin_github_access WHERE user_id=?').run(f.secondAdmin);db.prepare('DELETE FROM users WHERE id=?').run(f.secondAdmin);}
  delete f.secondAdmin;delete f.secondCookie;writeFileSync(manifest,JSON.stringify(f));console.log(`Removed ${files.length} explicitly scoped LOCAL forum objects and test threads; production untouched.`);
 }else{
  // Second administrator, needed to test per-recipient notification isolation.
  f.secondAdmin=`${f.prefix}_second`;const token=randomBytes(24).toString('hex'),session=`${f.prefix}_second_session`;
  db.prepare("INSERT INTO users(id,email,username,display_name,role,is_active,email_verified_at) VALUES(?,?,?,'QA segundo admin','admin',1,?)").run(f.secondAdmin,`${f.secondAdmin}@example.invalid`,f.secondAdmin,new Date().toISOString());
  db.prepare("INSERT INTO auth_sessions(id,user_id,token_hash,auth_method,expires_at) VALUES(?,?,?,'github',?)").run(session,f.secondAdmin,createHash('sha256').update(token).digest('hex'),new Date(Date.now()+3600_000).toISOString());
  db.prepare("INSERT INTO admin_github_access(id,github_login,user_id,access_level,is_active) VALUES(?,?,?,'administrator',1)").run(`${f.prefix}_second_grant`,`${f.prefix}-second`,f.secondAdmin);
  f.secondCookie=`chile3x_admin_session=${session}.${token}`;writeFileSync(manifest,JSON.stringify(f));
  for(const path of ['/foro/normas','/foro/notificaciones','/foro/moderacion']){
   assert.equal((await request(path)).status,200);for(const cookie of [undefined,f.ownerCookie])assert.ok([302,303,307].includes((await request(path,cookie??'')).status));
  }
  const initialRules=rules();
  try{await saved({action:'rules_update',version:initialRules.version,reglas:initialRules.rules+'\n\nNorma adicional de prueba local.'});
   reset();assert.equal((await send({action:'rules_update',version:initialRules.version,reglas:initialRules.rules})).status,409);
   reset();assert.equal((await send({action:'post_create',tema:f.forumTopicId,texto:'formulario obsoleto',rules_version:initialRules.version,rules_ack:'yes'})).status,428);
  }finally{db.prepare("UPDATE forum_settings SET rules=?,version=?,updated_by=?,updated_at=? WHERE id='global'").run(initialRules.rules,initialRules.version,initialRules.updated_by,initialRules.updated_at);}
  reset();assert.equal((await send({action:'post_create',tema:f.forumTopicId,texto:'sin normas'})).status,428);
  reset();assert.equal((await send({action:'post_create',tema:f.forumTopicId,texto:'normas antiguas',rules_version:'old',rules_ack:'yes'})).status,428);
  await saved({action:'watch_update',id:f.forumTopicId,enabled:'yes'},f.secondCookie);
  await saved({action:'post_create',tema:f.forumTopicId,texto:'Respuesta con aviso interno.',...ack()});
  const note=db.prepare('SELECT * FROM forum_notifications WHERE recipient_id=?').get(f.secondAdmin);assert.ok(note);
  assert.equal(db.prepare('SELECT count(*) n FROM forum_notifications WHERE recipient_id=?').get(f.admin).n,0);
  const secondHtml=await (await request('/foro/notificaciones',f.secondCookie)).text();assert.match(secondHtml,/Nueva respuesta/);
  await saved({action:'notifications_read',id:note.id});assert.equal(db.prepare('SELECT read_at FROM forum_notifications WHERE id=?').get(note.id).read_at,null);
  await saved({action:'notifications_read',id:note.id},f.secondCookie);assert.ok(db.prepare('SELECT read_at FROM forum_notifications WHERE id=?').get(note.id).read_at);
  const original=post(f.forumPostId);await saved({action:'report_create',id:original.id,version:original.updated_at,motivo:'privacy',detalle:'Revisar texto de prueba; no contiene datos reales.'});
  reset();assert.equal((await send({action:'report_create',id:original.id,version:original.updated_at,motivo:'privacy',detalle:'duplicado'})).status,409);
  const report=db.prepare('SELECT * FROM forum_reports WHERE post_id=?').get(original.id);
  await saved({action:'post_update',id:original.id,version:original.updated_at,texto:'Respuesta modificada durante denuncia.'});
  reset();assert.equal((await send({action:'report_resolve',id:report.id,post_version:original.updated_at,estado:'resolved',resolucion:'Vieja lectura',retirar:'yes'})).status,409);assert.equal(post(original.id).trashed_at,null);
  await saved({action:'report_resolve',id:report.id,post_version:post(original.id).updated_at,estado:'resolved',resolucion:'Revisado: retirar solo el mensaje de prueba.',retirar:'yes'});assert.ok(post(original.id).trashed_at);
  await saved({action:'post_update',id:original.id,version:post(original.id).updated_at,texto:'Respuesta recuperada.'});
  reset();assert.equal((await send({action:'report_resolve',id:report.id,post_version:post(original.id).updated_at,estado:'resolved',resolucion:'Repetir decisión no debe retirar',retirar:'yes'})).status,409);assert.equal(post(original.id).trashed_at,null);
  const png=readFileSync('public/favicon-192.png'),video=readFileSync('tmp/story-qa-video.mp4');
  assert.equal((await upload(png,'image/png',{consent:'no'})).status,400);
  assert.equal((await upload(new Uint8Array(),'image/png')).status,400);
  assert.equal((await upload('<svg xmlns="http://www.w3.org/2000/svg"></svg>','image/svg+xml')).status,400);
  assert.equal((await upload(readFileSync('tmp/forum-qa-too-long.mp4'),'video/mp4')).status,400);
  const large=new Uint8Array(5_000_001);large.set(png);assert.equal((await upload(large)).status,413);
  assert.equal((await upload(png,'image/png',{},f.ownerCookie)).status,401);
  const photo=await upload(png);assert.equal(photo.status,201,JSON.stringify(photo));const movie=await upload(video,'video/mp4');assert.equal(movie.status,201,JSON.stringify(movie));
  const file=attachment(photo.body.id);assert.equal(file.moderation_status,'pending');
  const stream=await request(`/foro/adjunto/${file.id}`);assert.equal(stream.status,200);assert.match(stream.headers.get('cache-control'),/no-store/);assert.deepEqual(Buffer.from(await stream.arrayBuffer()),png);
  assert.equal((await request(`/foro/adjunto/${file.id}`,f.ownerCookie)).status,404);assert.equal((await request(`/foro/adjunto/${file.id}`, '')).status,404);
  const range=await request(`/foro/adjunto/${movie.body.id}`,f.adminCookie,{headers:{range:'bytes=0-15'}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,16);
  await saved({action:'attachment_review',id:file.id,version:file.updated_at,estado:'approved'});assert.equal(attachment(file.id).moderation_status,'approved');
  reset();assert.equal((await send({action:'attachment_review',id:file.id,version:file.updated_at,estado:'rejected'})).status,409);
  await saved({action:'attachment_remove',id:file.id,version:attachment(file.id).updated_at});assert.ok(attachment(file.id).deleted_at);
  await saved({action:'attachment_restore',id:file.id,version:attachment(file.id).updated_at});assert.equal(attachment(file.id).moderation_status,'pending');
  assert.equal((await upload(png)).status,201);assert.equal((await upload(png)).status,201);assert.equal((await upload(png)).status,409);
  const secondPost=note.post_id;
  // Fixed 200 MB global budget includes retired objects pending cleanup.
  db.prepare('UPDATE forum_attachments SET byte_size=200000000 WHERE id=?').run(file.id);const quota=await upload(png,'image/png',{},f.adminCookie,secondPost);assert.equal(quota.status,409);db.prepare('UPDATE forum_attachments SET byte_size=? WHERE id=?').run(png.byteLength,file.id);
  assert.equal((await request(`/foro/tema/${f.forumTopicId}`)).status,200);assert.equal((await request('/foro/moderacion?estado=cerradas')).status,200);
  const audits=db.prepare("SELECT metadata,after_data FROM admin_audit_logs WHERE actor_user_id=? AND category='forum'").all(f.admin);assert.doesNotMatch(JSON.stringify(audits),/Respuesta recuperada|Revisar texto de prueba/);
  // Local synthetic load: 250 topics / 1,000 replies; never created remotely.
  const topicInsert=db.prepare('INSERT INTO forum_topics(id,section_id,title,author_id,author_name) VALUES(?,?,?,?,?)'),postInsert=db.prepare('INSERT INTO forum_posts(id,topic_id,author_id,author_name,body) VALUES(?,?,?,?,?)');
  db.exec('BEGIN');try{for(let i=0;i<250;i++){const id=`${f.prefix}_load_${i}`;topicInsert.run(id,f.forumSectionId,`QA carga local ${i}`,f.admin,'QA local');for(let n=0;n<4;n++)postInsert.run(`${id}_${n}`,id,f.admin,'QA local',`Mensaje de carga local ${n}`);}db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  const start=performance.now();const responses=await Promise.all(Array.from({length:8},(_,i)=>request(`/foro?seccion=${f.forumSectionId}&pagina=${i+1}`)));
  for(const response of responses){assert.equal(response.status,200);assert.ok((await response.text()).length<500_000);}
  console.log(`PASS: norms, two-admin notification isolation, stale/duplicate reports and decisions, private PNG/MP4 storage/ranges, consent/type/size/role/quota errors, review/restore/audit. Local load: 250 topics/1,000 posts, 8 paginated requests in ${Math.round(performance.now()-start)} ms. No real accounts or announcements modified.`);
  db.prepare('UPDATE profile_details SET metadata=? WHERE profile_id=?').run(JSON.stringify({age:'25',availability:['mon','tue','wed','thu','fri','sat','sun'].map(day=>`${day}=00:00-24:00`).join('|')}),f.profileId);
 }
}finally{db.close();}
