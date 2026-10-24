// Disposable loopback-only test data and proxies. No remote D1, real email,
// user credentials, application bypass endpoint or production mutation.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,existsSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'node:http';
import {spawnSync} from 'node:child_process';
const root=resolve('.wrangler/visual-state');
const database=resolve(root,'v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(database.startsWith(root+'\\')||database.startsWith(root+'/'));
const manifest=resolve('outputs/qa-account-stories.json');
const upstream='http://127.0.0.1:3880';
const hash=value=>createHash('sha256').update(value).digest('hex');
const mode=process.argv[2];
if(mode==='seed'){
 assert.ok(!existsSync(manifest),'Clean up the previous fixture before creating another.');
 const db=new DatabaseSync(database);db.exec('PRAGMA foreign_keys=ON; BEGIN');
 const f={prefix:'qa_stories_'+randomBytes(5).toString('hex'),users:[],profiles:[],cookies:{}};
 try{
  for(const role of ['owner','admin','content','empty']){
   const id=f.prefix+'_'+role;f.users.push(id);const browser=randomBytes(32).toString('base64url'),secret=randomBytes(24).toString('base64url'),session=id+'_session';
   db.prepare('INSERT INTO users(id,email,username,display_name,role,is_active,email_verified_at,city) VALUES(?,?,?,?,?,1,?,?)').run(id,id+'@example.invalid',id,role==='owner'?'Cuenta de historias QA':role==='admin'?'Administración QA':'Cuenta QA '+role,role==='admin'?'admin':'advertiser',new Date().toISOString(),'Concepción');
   db.prepare('INSERT INTO auth_sessions(id,user_id,token_hash,browser_key_hash,auth_method,expires_at) VALUES(?,?,?,?,?,?)').run(session,id,hash(secret),hash(browser),role==='admin'?'github':'password',new Date(Date.now()+12*3600000).toISOString());
   f.cookies[role]=`${role==='admin'?'chile3x_admin_session':'chile3x_user_session'}=${session}.${secret}; __Host-chile3x_browser=${browser}`;
   if(role==='admin')db.prepare("INSERT INTO admin_github_access(id,github_login,user_id,access_level,is_active) VALUES(?,?,?,'owner',1)").run(id+'_grant','qa-stories-admin',id);
  }
  for(const [suffix,type,status,hidden,trash,role] of [['escort','escort','approved',null,null,'owner'],['agency','agency','approved',null,null,'owner'],['rental','rental','approved',null,null,'owner'],['pending','agency','pending',null,null,'owner'],['draft','rental','draft',null,null,'owner'],['hidden','agency','approved',new Date().toISOString(),null,'owner'],['trash','rental','approved',null,new Date().toISOString(),'owner'],['content','escort','approved',null,null,'content']]){
   const id=f.prefix+'_'+suffix;f.profiles.push(id);
   db.prepare('INSERT INTO profiles(id,owner_id,type,status,slug,handle,display_name,region,city,tier,is_demo,owner_hidden_at,trashed_at) VALUES(?,?,?,?,?,?,?,?,?,\'vip\',1,?,?)').run(id,f.prefix+'_'+role,type,status,id,id,({escort:'Anuncio Escort QA',agency:'Agencia QA',rental:'Arriendo QA',pending:'Anuncio en revisión QA',draft:'Borrador QA',hidden:'Anuncio oculto QA',trash:'Papelera QA',content:'Contenido digital QA'})[suffix],'Región del Biobío','Concepción',hidden,trash);
   db.prepare('INSERT INTO profile_details(profile_id,metadata) VALUES(?,?)').run(id,JSON.stringify({age:'25',...(role==='content'?{content_only:'1'}:{})}));
   if(status==='approved'&&!trash)db.prepare("INSERT INTO profile_statuses(id,profile_id,body,story_type,expires_at) VALUES(?,?,?,'text',?)").run(id+'_text',id,'Historia de texto para comprobación local.',new Date(Date.now()+24*3600000).toISOString());
  }
  db.exec('COMMIT');mkdirSync(resolve('outputs'),{recursive:true});writeFileSync(manifest,JSON.stringify(f));console.log('Disposable local story fixtures ready (four accounts, eight advertisements).');
 }catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
}else if(mode==='serve'){
 const f=JSON.parse(readFileSync(manifest));assert.match(f.prefix,/^qa_stories_[a-f0-9]+$/);
 const anonymousBrowserCookie=f.cookies.empty.split('; ').filter(value=>value.startsWith('__Host-chile3x_browser=')).join('; ');
 let previewRole='owner';
 for(const [role,port] of [['owner',3881],['admin',3882],['content',3883],['empty',3884],['anonymous',3885]])createServer(async(req,res)=>{
  try{
   if(port===3881&&/^\/__qa\/role\/(owner|admin|content|empty|anonymous)$/.test(req.url??'')){
    previewRole=req.url.split('/').at(-1);res.writeHead(303,{location:previewRole==='admin'?'/admin':previewRole==='anonymous'?'/':'/mi-cuenta/historias','cache-control':'no-store'});res.end();return;
   }
   const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value&&!['host','cookie','connection','content-length','accept-encoding'].includes(key))headers.set(key,Array.isArray(value)?value.join(','):value);
   const activeRole=port===3881?previewRole:role;
   headers.set('cookie',activeRole==='anonymous'?anonymousBrowserCookie:f.cookies[activeRole]??'');headers.set('authorization','qa-loopback');
   if(headers.has('origin'))headers.set('origin',upstream);
   let body;if(!['GET','HEAD'].includes(req.method)){const chunks=[];for await(const chunk of req)chunks.push(chunk);body=Buffer.concat(chunks);}
   const result=await fetch(upstream+req.url,{method:req.method,headers,body,redirect:'manual'});
   const outgoing=Object.fromEntries([...result.headers].filter(([key])=>!['content-encoding','content-length','transfer-encoding','set-cookie'].includes(key)));
   if(outgoing.location?.startsWith(upstream))outgoing.location=outgoing.location.replace(upstream,`http://127.0.0.1:${port}`);
   const responseBody=Buffer.from(await result.arrayBuffer());
   const proxyBody=(outgoing['content-type']??'').includes('application/json')?Buffer.from(responseBody.toString('utf8').replaceAll(upstream,`http://127.0.0.1:${port}`)):responseBody;
   res.writeHead(result.status,outgoing);res.end(proxyBody);
  }catch(error){res.writeHead(502);res.end('Local QA upstream unavailable: '+error.name);}
 }).listen(port,'127.0.0.1',()=>console.log('Local '+role+' QA: http://127.0.0.1:'+port));
}else if(mode==='contacts'){
 const f=JSON.parse(readFileSync(manifest));assert.match(f.prefix,/^qa_stories_[a-f0-9]+$/);
 const id=f.prefix+'_escort';assert.ok(f.profiles.includes(id));const db=new DatabaseSync(database);
 try{
  const row=db.prepare('SELECT metadata FROM profile_details WHERE profile_id=?').get(id);assert.ok(row);
  const metadata={...JSON.parse(row.metadata),instagram_url:'https://instagram.com/chile3x_qa_fixture',arsmate_url:'https://arsmate.com/chile3x_qa_fixture',onlyfans_url:'https://onlyfans.com/chile3x_qa_fixture'};
  db.prepare('UPDATE profile_details SET metadata=?, contact_email=?, contact_phone=? WHERE profile_id=?').run(JSON.stringify(metadata),'qa@example.invalid','56911111111',id);
  // Demo profiles intentionally suppress contact controls. This loopback-only
  // fixture must exercise the actual public contact rendering instead.
  db.prepare('UPDATE profiles SET contact_whatsapp=?, contact_telegram=?, is_demo=0 WHERE id=?').run('56911111111','chile3x_qa_fixture',id);
  console.log('Disposable local advertisement now exercises all contact buttons.');
 }finally{db.close();}
}else if(mode==='check'){
 const f=JSON.parse(readFileSync(manifest));assert.match(f.prefix,/^qa_stories_[a-f0-9]+$/);
 const request=(path,role='owner',options={})=>fetch(upstream+path,{...options,redirect:'manual',headers:{cookie:f.cookies[role]??'',origin:upstream,...options.headers}});
 for(const [path,role] of [['/mi-cuenta','owner'],['/mi-cuenta/historias','owner'],['/','owner'],['/admin','admin'],['/mi-cuenta/historias','content'],['/mi-cuenta/historias','empty']]){
  const result=await request(path,role);const html=await result.text();assert.equal(result.status,200,path);assert.doesNotMatch(html,/\d+:E\{|Worker exceeded resource limits/);console.log('PASS rendered '+role+' '+path);
  if(path==='/mi-cuenta/historias'&&role==='owner'){assert.match(html,/No disponibles por ahora/);assert.ok(html.indexOf('Anuncio Escort QA')<html.indexOf('Anuncio en revisión QA'));assert.ok(!html.includes('Contenido digital QA'));assert.ok(!html.includes('Papelera QA'));assert.match(html,/noindex/);}
  if(role==='admin')assert.ok(!html.includes('account-toolbar-stories'));
 }
 for(const role of ['anonymous','admin']){const result=await request('/mi-cuenta/historias',role);assert.ok([303,307,409].includes(result.status));}
 const publish=async(profileId,type)=>{
  const data=new FormData();data.set('profile_id',profileId);data.set('return_to','/mi-cuenta');data.set('body','Historia local QA '+type);
  if(type==='image')data.set('image',new Blob([readFileSync('public/chile3x-social-card.png')],{type:'image/png'}),'qa.png');
  if(type==='video')data.set('video',new Blob([readFileSync('outputs/qa-video-3s.mp4')],{type:'video/mp4'}),'qa.mp4');
  return request('/api/historias','owner',{method:'POST',headers:{accept:'application/json'},body:data});
 };
 for(const suffix of ['pending','hidden','trash','content'])assert.equal((await publish(f.prefix+'_'+suffix,'text')).status,403,suffix);
 for(const type of ['text','image','video']){const result=await publish(f.prefix+'_escort',type);assert.equal(result.status,201,JSON.stringify(await result.json()));}
 const detail=await request('/mi-cuenta/'+f.prefix+'_escort/historias');const storyPayload=await detail.text();assert.equal(detail.status,200);assert.ok(storyPayload.includes('Historia local QA image'));assert.ok(storyPayload.includes('Historia local QA video'));
 const foreign=await request('/mi-cuenta/'+f.prefix+'_content/historias');assert.equal(foreign.status,404);
 console.log('PASS ownership, approval, hidden/trash guards, real text/photo/video publication and private story manager.');
}else if(mode==='smoke'){
 const f=JSON.parse(readFileSync(manifest));assert.match(f.prefix,/^qa_stories_[a-f0-9]+$/);
 const paths={owner:['/mi-cuenta','/mi-cuenta/historias','/mi-cuenta/nuevo-perfil','/mi-cuenta/datos-personales','/mi-cuenta/contenido','/mi-cuenta/mensajes','/mi-cuenta/telegram',`/mi-cuenta/${f.prefix}_escort/editar`,`/mi-cuenta/${f.prefix}_escort/historias`,`/mi-cuenta/${f.prefix}_pending/historias`,`/mi-cuenta/${f.prefix}_escort/estadisticas`,`/perfil/@${f.prefix}_escort`,`/perfil/@${f.prefix}_pending`,`/perfil/@${f.prefix}_draft`],admin:['/admin','/admin/cuentas','/admin/medios','/admin/anuncios-publicaciones','/admin/configuracion/correo','/admin/correos','/admin/patrocinadores','/admin/documentos-legales',`/admin/cuentas/${f.prefix}_owner`,`/admin/anuncios-publicaciones/${f.prefix}_escort/editar`,`/admin/cuentas/${f.prefix}_owner/perfiles/${f.prefix}_escort/medios`]};
 let total=0;
 for(const [role,urls] of Object.entries(paths))for(const path of urls){
  const result=await fetch(upstream+path,{redirect:'manual',signal:AbortSignal.timeout(30000),headers:{cookie:f.cookies[role]}});const html=await result.text();
  assert.equal(result.status,200,`${role} ${path}`);assert.doesNotMatch(html,/\d+:E\{|Worker exceeded resource limits|Ha ocurrido un error inesperado/,path);total++;
 }
 console.log(`PASS ${total} private/public pages: account, admin, editors, media, mail, stories and contact profile.`);
}else if(mode==='cleanup'){
 const f=JSON.parse(readFileSync(manifest));assert.match(f.prefix,/^qa_stories_[a-f0-9]+$/);
 // Remove media through its ordinary local endpoint first, never orphan R2.
 const db=new DatabaseSync(database);const ids=db.prepare('SELECT id FROM profile_statuses WHERE profile_id IN (SELECT value FROM json_each(?))').all(JSON.stringify(f.profiles));
 const photos=db.prepare('SELECT id,profile_id FROM profile_media WHERE profile_id IN (SELECT value FROM json_each(?))').all(JSON.stringify(f.profiles));
 for(const photo of photos){assert.ok(f.profiles.includes(photo.profile_id));const row=db.prepare('SELECT revision FROM profiles WHERE id=?').get(photo.profile_id);const data=new FormData();data.set('review_key','profile:'+photo.profile_id);data.set('review_revision',String(row.revision));const result=await fetch(upstream+'/api/admin/profiles/'+photo.profile_id+'/media/'+photo.id,{method:'DELETE',headers:{cookie:f.cookies.admin,origin:upstream},body:data});if(![200,404].includes(result.status))throw Error('Could not clean local QA photo: '+result.status);}
 for(const {id} of ids){const data=new FormData();data.set('return_to','/mi-cuenta');const result=await fetch(upstream+'/api/historias/'+id,{method:'POST',redirect:'manual',headers:{cookie:f.cookies.owner,origin:upstream},body:data});if(![303,404].includes(result.status))throw Error('Could not clean local owner story: '+result.status);}
 db.exec('PRAGMA foreign_keys=ON; BEGIN');
 try{
  for(const id of f.profiles){assert.ok(id.startsWith(f.prefix+'_'));db.prepare('DELETE FROM profiles WHERE id=?').run(id);}
  for(const id of f.users){assert.ok(id.startsWith(f.prefix+'_'));db.prepare('DELETE FROM admin_audit_logs WHERE actor_user_id=?').run(id);db.prepare('DELETE FROM admin_github_access WHERE user_id=?').run(id);db.prepare('DELETE FROM users WHERE id=?').run(id);}
  db.exec('COMMIT');
  const jobs=db.prepare('SELECT r2_key FROM data_deletion_jobs WHERE instr(r2_key,?)>0').all(f.prefix);
  for(const job of jobs){assert.ok(job.r2_key.includes(f.prefix));const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','delete','chile3x-media/'+job.r2_key,'--local','--persist-to',root],{encoding:'utf8'});if(result.status!==0)throw Error('Could not remove a disposable local R2 object.');db.prepare('DELETE FROM data_deletion_jobs WHERE r2_key=?').run(job.r2_key);}
  unlinkSync(manifest);console.log('Disposable local story fixtures and their files removed.');
 }catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}
}else throw Error('Use seed, serve, contacts, check, smoke or cleanup.');
