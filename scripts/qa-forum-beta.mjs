// Disposable LOCAL fixtures only. This script cannot target production.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base='http://localhost:3000';
const fixture=JSON.parse(readFileSync('outputs/qa-media-admin.json','utf8'));
assert.ok(fixture.prefix.startsWith('qa_media_'));
const db=new DatabaseSync(resolve('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite'));
db.exec('PRAGMA foreign_keys=ON');
const read=(path,cookie)=>fetch(base+path,{headers:{...(cookie?{cookie}:{}),authorization:'qa-local-cache-bypass'},redirect:'manual'});
const send=(fields,cookie=fixture.adminCookie,origin=base)=>fetch(base+'/api/admin/foro',{method:'POST',headers:{cookie,origin,accept:'application/json','content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(fields),redirect:'manual'});
async function save(fields){const result=await send(fields);const body=await result.json();assert.equal(result.status,200,JSON.stringify(body));return body.redirectTo;}
const sections=()=>db.prepare('SELECT * FROM forum_sections WHERE id=?').get(fixture.forumSectionId);
const topic=()=>db.prepare('SELECT * FROM forum_topics WHERE id=?').get(fixture.forumTopicId);
const moderate=(changes={})=>({action:'topic_update',id:fixture.forumTopicId,version:topic().updated_at,titulo:topic().title,seccion:topic().section_id,...changes});
const cleanup=()=>{
  if(fixture.forumTopicId){db.prepare('DELETE FROM forum_posts WHERE topic_id=?').run(fixture.forumTopicId);db.prepare('DELETE FROM forum_topics WHERE id=?').run(fixture.forumTopicId);}
  if(fixture.forumSectionId)db.prepare('DELETE FROM forum_sections WHERE id=?').run(fixture.forumSectionId);
  delete fixture.forumTopicId;delete fixture.forumSectionId;delete fixture.forumPostId;
  writeFileSync('outputs/qa-media-admin.json',JSON.stringify(fixture));
};
try{
  if(process.argv[2]==='cleanup'){cleanup();console.log('Removed only disposable LOCAL forum topic, replies and section.');}
  else {
    if(!db.prepare("SELECT name FROM sqlite_master WHERE name='forum_sections'").get())db.exec(readFileSync('drizzle/0044_private_forum_beta.sql','utf8'));
    for(const path of ['/foro','/foro/nuevo','/foro/secciones','/foro/tema/inexistente']){
      const anonymous=await read(path);assert.ok([302,303,307].includes(anonymous.status));
      const user=await read(path,fixture.ownerCookie);assert.ok([302,303,307].includes(user.status));
      assert.ok(!((await user.text()).includes('Regiones de Chile')));
    }
    assert.equal((await send({action:'section_create'},fixture.ownerCookie)).status,401);
    assert.equal((await send({action:'section_create'},fixture.adminCookie,'https://otro.invalid')).status,403);
    db.prepare('UPDATE admin_github_access SET access_level=? WHERE user_id=?').run('moderator',fixture.admin);
    try{assert.equal((await send({action:'section_create'})).status,403);assert.ok([302,303,307].includes((await read('/foro',fixture.adminCookie)).status));}
    finally{db.prepare('UPDATE admin_github_access SET access_level=? WHERE user_id=?').run('administrator',fixture.admin);}
    assert.equal((await send({action:'topic_create',seccion:'foro_normas',titulo:'x',texto:'x'.repeat(6001)})).status,400);
    assert.equal((await send({action:'not_valid'})).status,400);
    assert.equal((await send({action:'section_create',grupo:'QA',nombre:'QA',descripcion:'',reglas:'',orden:'-1'})).status,400);
    await save({action:'section_create',grupo:'Pruebas locales',nombre:fixture.prefix,descripcion:'Sección desechable de QA.',reglas:'Solo datos ficticios.',orden:'1'});
    fixture.forumSectionId=db.prepare('SELECT id FROM forum_sections WHERE title=?').get(fixture.prefix).id;
    writeFileSync('outputs/qa-media-admin.json',JSON.stringify(fixture));
    const newPath=await save({action:'topic_create',seccion:fixture.forumSectionId,titulo:`${fixture.prefix} tema`,texto:'Primera publicación local. <script>alert("QA")</script> 50%_literal'});
    fixture.forumTopicId=newPath.split('/').at(-1);writeFileSync('outputs/qa-media-admin.json',JSON.stringify(fixture));
    assert.equal(db.prepare('SELECT count(*) n FROM forum_posts WHERE topic_id=?').get(fixture.forumTopicId).n,1);
    const html=await (await read(newPath,fixture.adminCookie)).text();assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>alert\("QA"\)/);
    for(const path of ['/foro',`/foro?q=50%25_literal`,`/foro?seccion=${fixture.forumSectionId}`,'/foro/secciones','/foro/nuevo',newPath])assert.equal((await read(path,fixture.adminCookie)).status,200,path);
    const counters=await (await read('/foro',fixture.adminCookie)).text();assert.match(counters,/1<!-- --> tema/);
    const found=await (await read('/foro?q=50%25_literal',fixture.adminCookie)).text();assert.ok(found.includes(newPath));
    const replyPath=await save({action:'post_create',tema:fixture.forumTopicId,texto:'Respuesta de QA local.'});fixture.forumPostId=replyPath.split('#')[1];
    const oldVersion=topic().updated_at;
    await save(moderate({fijado:'on',cerrado:'on'}));
    assert.equal((await send({action:'post_create',tema:fixture.forumTopicId,texto:'No debe guardarse'})).status,409);
    assert.equal((await send({...moderate(),version:oldVersion})).status,409);
    await save(moderate({papelera:'on'}));assert.ok(topic().trashed_at);
    await save(moderate());assert.equal(topic().trashed_at,null);
    const post=db.prepare('SELECT * FROM forum_posts WHERE id=?').get(fixture.forumPostId);
    await save({action:'post_update',id:post.id,version:post.updated_at,texto:'Respuesta editada local.',papelera:'on'});
    assert.ok(db.prepare('SELECT trashed_at FROM forum_posts WHERE id=?').get(post.id).trashed_at);
    const version=db.prepare('SELECT updated_at FROM forum_posts WHERE id=?').get(post.id).updated_at;
    await save({action:'post_update',id:post.id,version,texto:'Respuesta recuperada local.'});
    const section=sections();
    await save({action:'section_update',id:section.id,version:section.updated_at,grupo:'Pruebas locales',nombre:section.title,descripcion:section.description,reglas:section.rules,orden:'2',archivada:'on'});
    assert.equal((await send({action:'post_create',tema:fixture.forumTopicId,texto:'No debe guardarse'})).status,409);
    const archived=sections();await save({action:'section_update',id:archived.id,version:archived.updated_at,grupo:'Pruebas locales',nombre:archived.title,descripcion:archived.description,reglas:archived.rules,orden:'2'});
    const audits=db.prepare("SELECT action,after_data,metadata FROM admin_audit_logs WHERE actor_user_id=? AND category='forum'").all(fixture.admin);
    for(const action of ['section_create','section_update','topic_create','topic_update','post_create','post_update'])assert.ok(audits.some(row=>row.action===`forum.${action}`));
    assert.doesNotMatch(JSON.stringify(audits),/Primera publicación local|Respuesta recuperada local/);
    // Help toggle: normal account navigation + direct URL, without disabling admin help.
    const previous=db.prepare("SELECT * FROM site_settings WHERE key='account_help_enabled'").get();
    const toggle=enabled=>fetch(base+'/api/admin/settings',{method:'POST',headers:{cookie:fixture.adminCookie,origin:base},body:new URLSearchParams({account_help_enabled:enabled,return_to:'/admin/configuracion/ayuda'}),redirect:'manual'});
    try{
      assert.equal((await toggle('disabled')).status,303);
      const account=await (await read('/mi-cuenta',fixture.ownerCookie)).text();assert.doesNotMatch(account,/href="\/mi-cuenta\/ayuda"/);
      assert.equal((await read('/mi-cuenta/ayuda',fixture.ownerCookie)).status,404);
      assert.equal((await read('/admin/ayuda',fixture.adminCookie)).status,200);
      assert.equal((await toggle('enabled')).status,303);
      const help=await (await read('/mi-cuenta/ayuda',fixture.ownerCookie)).text();assert.match(help,/BOT DE AYUDA DE CHILE3X/);assert.match(help,/johnny-sins.jpg/);
    } finally {if(previous)db.prepare('UPDATE site_settings SET value=?,updated_by=?,updated_at=? WHERE key=?').run(previous.value,previous.updated_by,previous.updated_at,previous.key);else db.prepare("DELETE FROM site_settings WHERE key='account_help_enabled'").run();}
    // 24/7 and contact scope on the disposable ad only.
    db.prepare('INSERT INTO profile_details(profile_id,metadata) VALUES(?,?) ON CONFLICT(profile_id) DO UPDATE SET metadata=excluded.metadata').run(fixture.profileId,JSON.stringify({availability:['mon','tue','wed','thu','fri','sat','sun'].map(day=>`${day}=00:00-24:00`).join('|')}));
    db.prepare('UPDATE profiles SET contact_whatsapp=?,is_demo=0 WHERE id=?').run('12025550100',fixture.profileId);
    const adPath=`/perfil/@${fixture.prefix}`;
    const ad=await read(adPath,fixture.ownerCookie);assert.equal(ad.status,200);
    const adHtml=await ad.text();assert.match(adHtml,/Todos los días/);assert.doesNotMatch(adHtml,/class="availability-list"/);
    assert.match(adHtml,/12025550100/);
    const picture=await read('/help/johnny-sins.jpg');assert.equal(picture.status,200);
    writeFileSync('outputs/qa-media-admin.json',JSON.stringify(fixture));
    console.log('PASS: private roles/CSRF, CRUD, safe text, search, archive, close/pin/move/trash/restore, optimistic edits, audit without bodies, help off/on, 24/7 and advertiser contact. Local previews retained until cleanup.');
  }
}finally{db.close();}
