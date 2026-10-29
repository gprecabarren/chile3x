import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {drizzle} from 'drizzle-orm/d1';
import {getTableConfig} from 'drizzle-orm/sqlite-core';

test('owner photo edits stay private until approved and preserve ownership, revision and cancellation',async t=>{
  const sqlite=new DatabaseSync(':memory:'),objects=new Map(),audits=[],notifications=[];
  const prepare=(query,args=[])=>({bind:(...values)=>prepare(query,values),execute(){const stmt=sqlite.prepare(query);return stmt.columns().length?{results:stmt.all(...args)}:{results:[],meta:stmt.run(...args)};},async all(){return this.execute();},async run(){return this.execute();},async raw(){const stmt=sqlite.prepare(query);stmt.setReturnArrays(true);return stmt.all(...args);}});
  globalThis.__ownerPhotoDb=drizzle({prepare,async batch(statements){sqlite.exec('BEGIN');try{const rows=statements.map(s=>s.execute());sqlite.exec('COMMIT');return rows;}catch(e){sqlite.exec('ROLLBACK');throw e;}}});
  globalThis.__ownerPhotoUser={id:'owner'};globalThis.__ownerPhotoAdmin=null;globalThis.__ownerPhotoBlur='enabled';
  globalThis.__ownerPhotoBucket={async head(key){const o=objects.get(key);return o?{size:o.bytes.length,customMetadata:o.metadata}:null;},async get(key){const o=objects.get(key);return o?{body:new Blob([o.bytes]).stream(),size:o.bytes.length,customMetadata:o.metadata}:null;},async put(key,body,options){objects.set(key,{bytes:new Uint8Array(await new Response(body).arrayBuffer()),metadata:options.customMetadata});},async delete(key){objects.delete(key);}};
  globalThis.__ownerPhotoAudit=(_actor,input)=>{audits.push(input);};globalThis.__ownerPhotoNotify=input=>notifications.push(input);
  const hooks=registerHooks({resolve(specifier,context,next){const stubs={
    '@/db':'export const getDb=async()=>globalThis.__ownerPhotoDb;',
    '@/lib/auth':'export const hasTesterAutoApproval=()=>false;export const getCurrentUser=async()=>globalThis.__ownerPhotoUser;export const getCurrentAdmin=async()=>globalThis.__ownerPhotoAdmin;export function assertSameOrigin(r){if(r.headers.get("origin")!==new URL(r.url).origin)throw Error("origin");}',
    '@/lib/site-settings':'export const getSiteSettings=async()=>({profile_gallery_face_blur_enabled:globalThis.__ownerPhotoBlur});',
    '@/lib/admin-notifications':'export const createAdminNotification=async input=>globalThis.__ownerPhotoNotify(input);',
    '@/lib/admin-audit':'export const recordAdminAudit=async(actor,input)=>globalThis.__ownerPhotoAudit(actor,input);',
    '@/lib/admin-permissions':'export const adminHasCapability=()=>globalThis.__ownerPhotoPermission!==false;',
    'cloudflare:workers':'export const env={get MEDIA(){return globalThis.__ownerPhotoBucket;}};',
    'next/server':'export class NextRequest extends Request{};export const NextResponse={json:(data,init)=>Response.json(data,init),redirect:(url,status=307)=>new Response(null,{status,headers:{location:String(url)}})};',
  };if(stubs[specifier])return{url:'data:text/javascript,'+encodeURIComponent(stubs[specifier]),shortCircuit:true};if(specifier.startsWith('@/'))return{url:new URL('../'+specifier.slice(2)+'.ts',import.meta.url).href,shortCircuit:true};if((specifier.startsWith('./')||specifier.startsWith('../'))&&!/\.[a-z]+$/i.test(specifier))return{url:new URL(specifier+'.ts',context.parentURL).href,shortCircuit:true};return next(specifier,context);}});
  try{
    const schema=await import('../db/schema.ts');
    for(const table of Object.values(schema)){let c;try{c=getTableConfig(table);}catch{continue;}if(['collaboration_guards','review_reservations','settings_revision'].includes(c.name))continue;sqlite.exec(`CREATE TABLE IF NOT EXISTS "${c.name}" (${c.columns.filter(x=>x.name!=='revision').map(x=>`"${x.name}" ${x.getSQLType()}${x.primary?' PRIMARY KEY':''}`).join(',')})`);}
    sqlite.exec(await readFile(new URL('../drizzle/0056_admin_collaboration.sql',import.meta.url),'utf8'));sqlite.exec('CREATE UNIQUE INDEX owner_qa_r2_jobs ON data_deletion_jobs(r2_key)');
    sqlite.exec("INSERT INTO users(id,role,is_active) VALUES('owner','advertiser',1),('other','advertiser',1),('off','advertiser',0);INSERT INTO profiles(id,owner_id,type,status,is_demo) VALUES('profile','owner','escort','approved',0),('foreign','other','escort','approved',0),('trash','owner','escort','approved',0),('off_profile','off','escort','approved',0);UPDATE profiles SET trashed_at='trash' WHERE id='trash';");
    const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
    function seed(id,profile='profile',kind='image',visibility='public',status='approved',pointer){const key=id+'.png';sqlite.prepare('INSERT INTO profile_media(id,profile_id,media_type,r2_key,byte_size,content_type,moderation_status,visibility,is_profile_photo,sort_order,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,profile,kind,key,png.length,'image/png',status,visibility,id==='base'?1:0,0,new Date().toISOString());objects.set(key,{bytes:png,metadata:{photoOptions:JSON.stringify({watermark:false,blur:false,faceRegions:[]}),...(pointer?{replacesMediaId:pointer}:{})}});}
    seed('base');seed('foreign_photo','foreign');seed('private_photo','profile','image','exclusive');seed('video','profile','video');seed('trash_photo','trash');seed('off_photo','off_profile');
    const route=await import('../app/api/perfiles/[profileId]/media/[mediaId]/procesar/route.ts'),removeRoute=await import('../app/api/perfiles/[profileId]/media/[mediaId]/route.ts'),moderate=await import('../app/api/admin/media/[mediaId]/route.ts');
    const {getOwnerEditableProfileMedia}=await import('../lib/owner-photo-edit.ts');
    const rev=profile=>sqlite.prepare('SELECT revision FROM profiles WHERE id=?').get(profile).revision;
    const params=(id,profile='profile')=>({params:Promise.resolve({profileId:profile,mediaId:id})});
    const get=(id,profile='profile',source=false)=>route.GET(new Request(`https://photo.invalid/api/perfiles/${profile}/media/${id}/procesar${source?'?source=1':''}`),params(id,profile));
    async function post(id,{profile='profile',revision=rev(profile),origin='https://photo.invalid',blur=false,watermark=true}={}){const body=new FormData();body.set('review_key','profile:'+profile);body.set('review_revision',String(revision));body.set('options',JSON.stringify({watermark,blur,faceRegions:[]}));body.set('file',new File([png],'final.png',{type:'image/png'}));body.set('replacesMediaId','foreign_photo');return route.POST(new Request(`https://photo.invalid/api/perfiles/${profile}/media/${id}/procesar`,{method:'POST',headers:{origin},body}),params(id,profile));}
    async function adminAction(id,action){const body=new FormData();body.set('action',action);body.set('review_key','profile:profile');body.set('review_revision',String(rev('profile')));return moderate.POST(new Request('https://photo.invalid/api/admin/media/'+id,{method:'POST',headers:{origin:'https://photo.invalid'},body}),{params:Promise.resolve({mediaId:id})});}
    await t.test('denies anonymous, foreign, exclusive, video, disabled and trashed access',async()=>{
      globalThis.__ownerPhotoUser=null;assert.equal((await get('base')).status,401);assert.equal((await get('base','profile',true)).status,401);assert.equal((await post('base')).status,401);globalThis.__ownerPhotoUser={id:'owner'};
      assert.equal((await post('base',{origin:'https://other.invalid'})).status,403);
      for(const[id,profile]of[['foreign_photo','foreign'],['private_photo','profile'],['video','profile'],['trash_photo','trash'],['off_photo','off_profile'],['base','foreign']])assert.equal((await get(id,profile)).status,404,id);
      const state=await get('base');assert.equal(state.status,200);assert.match(state.headers.get('cache-control'),/no-store/);assert.equal((await state.json()).sourceUrl,'/api/perfiles/profile/media/base/procesar?source=1');
    });
    let pending;
    await t.test('approved source stays approved and stored while an owner submits a pending final',async()=>{
      const response=await post('base');assert.equal(response.status,200,await response.clone().text());const result=await response.json();pending=result.replacement.id;assert.equal(result.mediaId,'base');assert.equal(result.replacement.replacementOf,'base');assert.equal(result.replacement.moderationStatus,'pending');
      assert.equal(sqlite.prepare("SELECT moderation_status FROM profile_media WHERE id='base'").get().moderation_status,'approved');assert.ok(objects.has('base.png'));assert.equal(sqlite.prepare('SELECT moderation_status FROM profile_media WHERE id=?').get(pending).moderation_status,'pending');
      const rows=await getOwnerEditableProfileMedia('profile');assert.equal(rows.some(x=>x.id==='base'),false);assert.equal(rows.find(x=>x.id===pending).replacementOf,'base');assert.equal(objects.get(sqlite.prepare('SELECT r2_key FROM profile_media WHERE id=?').get(pending).r2_key).metadata.replacesMediaId,'base');
    });
    await t.test('editing pending replaces only its final, preserves its approved pointer and checks policy/revision',async()=>{
      const old=sqlite.prepare('SELECT r2_key FROM profile_media WHERE id=?').get(pending).r2_key;
      let response=await post(pending,{watermark:false});assert.equal(response.status,200);const result=await response.json();assert.equal(result.mediaId,pending);assert.equal(result.replacement,undefined);assert.ok(!objects.has(old));assert.ok(objects.has('base.png'));
      const before=objects.size;response=await post(pending,{revision:0});assert.equal(response.status,409);assert.equal(objects.size,before);
      globalThis.__ownerPhotoBlur='disabled';response=await post(pending,{blur:true});assert.equal(response.status,403);assert.equal(objects.size,before);globalThis.__ownerPhotoBlur='enabled';
    });
    await t.test('canceling the pending rendition restores its original in the UI without deleting it',async()=>{
      const body=new FormData();body.set('review_key','profile:profile');body.set('review_revision',String(rev('profile')));
      const response=await removeRoute.DELETE(new Request('https://photo.invalid/api/perfiles/profile/media/'+pending,{method:'DELETE',headers:{origin:'https://photo.invalid'},body}),params(pending));assert.equal(response.status,200);const result=await response.json();assert.equal(result.restoredMedia.id,'base');assert.equal(result.restoredMedia.moderationStatus,'approved');assert.ok(objects.has('base.png'));assert.equal(sqlite.prepare('SELECT count(*) n FROM profile_media WHERE id=?').get(pending).n,0);
    });
    await t.test('moderator approval atomically publishes replacement and retires only its validated original',async()=>{
      let response=await post('base');pending=(await response.json()).replacement.id;
      response=await adminAction(pending,'approve');assert.equal(response.status,303);assert.equal(sqlite.prepare('SELECT moderation_status FROM profile_media WHERE id=?').get(pending).moderation_status,'pending');
      globalThis.__ownerPhotoAdmin={id:'admin'};response=await adminAction(pending,'approve');assert.equal(response.status,303);assert.equal(sqlite.prepare('SELECT count(*) n FROM profile_media WHERE id=?').get(pending).n,0);assert.equal(sqlite.prepare("SELECT moderation_status FROM profile_media WHERE id='base'").get().moderation_status,'approved');assert.ok(!objects.has('base.png'));assert.ok(objects.has('foreign_photo.png'));assert.equal(audits.at(-1).metadata.replacedMediaId,'base');
    });
    await t.test('logical upload limits count edited photos once while physical bytes remain accounted',async()=>{
      sqlite.exec("INSERT INTO profiles(id,owner_id,type,status,is_demo) VALUES('many','owner','escort','approved',0)");
      for(let i=0;i<9;i++){seed('base_many_'+i,'many');seed('pending_many_'+i,'many','image','public','pending','base_many_'+i);}
      const {uploadProfileMedia}=await import('../lib/profile-media-upload.ts');
      const result=await uploadProfileMedia({profileId:'many',file:new File([png],'new.png',{type:'image/png'}),uploadKind:'gallery',uploadedBy:'owner',moderationStatus:'pending'});assert.equal(result.media.moderationStatus,'pending');assert.equal((await getOwnerEditableProfileMedia('many')).length,10);assert.equal(sqlite.prepare("SELECT count(*) n FROM profile_media WHERE profile_id='many'").get().n,19);
      await assert.rejects(()=>uploadProfileMedia({profileId:'many',file:new File([png],'new.png',{type:'image/png'}),uploadKind:'gallery',uploadedBy:'owner',moderationStatus:'pending'}),/máximo de 10/);
    });
    await t.test('gallery order is authorized, transactional, isolated by format and preserves pending replacement order',async()=>{
      sqlite.exec("INSERT INTO users(id,role,is_active) VALUES('admin','admin',1),('other_admin','admin',1)");
      const ownerOrder=await import('../app/api/perfiles/[profileId]/media/route.ts'),adminOrder=await import('../app/api/admin/profiles/[profileId]/media/route.ts');
      seed('gallery_a');seed('gallery_b');seed('pending_a','profile','image','public','pending','gallery_a');seed('video_2','profile','video');
      const ids=['gallery_b','pending_a'];
      const snapshot=()=>sqlite.prepare("SELECT id,sort_order,moderation_status,r2_key,is_profile_photo FROM profile_media WHERE profile_id='profile' ORDER BY id").all();
      const patch=(handler,{order=ids,kind='image',profile='profile',revision=rev(profile),origin='https://photo.invalid'}={})=>{const body=new FormData();body.set('review_key','profile:'+profile);body.set('review_revision',String(revision));body.set('kind',kind);body.set('order',JSON.stringify(order));body.set('mutation_id',crypto.randomUUID());return handler.PATCH(new Request('https://photo.invalid/api/perfiles/'+profile+'/media',{method:'PATCH',headers:{origin},body}),{params:Promise.resolve({profileId:profile})});};
      const before=snapshot(),objectKeys=[...objects.keys()];
      globalThis.__ownerPhotoUser=null;assert.equal((await patch(ownerOrder)).status,401);globalThis.__ownerPhotoUser={id:'other'};assert.equal((await patch(ownerOrder)).status,403);globalThis.__ownerPhotoUser={id:'owner'};
      assert.equal((await patch(ownerOrder,{origin:'https://other.invalid'})).status,403);
      for(const order of [[],['gallery_b','gallery_b'],['gallery_b','foreign_photo'],['base','gallery_b','pending_a'],['private_photo','pending_a']])assert.equal((await patch(ownerOrder,{order})).status,400);
      assert.deepEqual(snapshot(),before);
      const oldRevision=rev('profile'),response=await patch(ownerOrder);assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).revision,rev('profile'));
      assert.equal(sqlite.prepare("SELECT sort_order FROM profile_media WHERE id='gallery_b'").get().sort_order,0);
      assert.equal(sqlite.prepare("SELECT sort_order FROM profile_media WHERE id='pending_a'").get().sort_order,1);
      assert.equal(sqlite.prepare("SELECT sort_order FROM profile_media WHERE id='gallery_a'").get().sort_order,1,'approved base follows pending replacement');
      assert.equal((await patch(ownerOrder,{revision:oldRevision})).status,409);
      const imageSnapshot=snapshot().filter(x=>!['video','video_2'].includes(x.id));
      assert.equal((await patch(ownerOrder,{kind:'video',order:['video_2','video']})).status,200);assert.deepEqual(snapshot().filter(x=>!['video','video_2'].includes(x.id)),imageSnapshot);
      globalThis.__ownerPhotoAdmin=null;assert.equal((await patch(adminOrder)).status,401);globalThis.__ownerPhotoAdmin={id:'admin'};globalThis.__ownerPhotoPermission=false;assert.equal((await patch(adminOrder)).status,403);globalThis.__ownerPhotoPermission=true;
      sqlite.prepare('INSERT INTO review_reservations VALUES(?,?,?,?)').run('profile:profile','other_admin','lease',Date.now()+10000);assert.equal((await patch(adminOrder)).status,409);sqlite.exec('DELETE FROM review_reservations');
      assert.equal((await patch(adminOrder,{order:['pending_a','gallery_b']})).status,200);assert.equal(audits.at(-1).action,'media.public_reorder');
      assert.deepEqual([...objects.keys()],objectKeys,'ordering never duplicates or deletes storage objects');
      for(const row of snapshot()){const old=before.find(x=>x.id===row.id);assert.equal(row.r2_key,old.r2_key);assert.equal(row.moderation_status,old.moderation_status);assert.equal(row.is_profile_photo,old.is_profile_photo);}
      const adminDelete=await import('../app/api/admin/profiles/[profileId]/media/[mediaId]/route.ts'),body=new FormData();body.set('review_key','profile:profile');body.set('review_revision',String(rev('profile')));
      const canceled=await adminDelete.DELETE(new Request('https://photo.invalid/api/admin/profiles/profile/media/pending_a',{method:'DELETE',headers:{origin:'https://photo.invalid'},body}),params('pending_a'));
      assert.equal(canceled.status,200);assert.equal((await canceled.json()).restoredMedia.id,'gallery_a');assert.equal(sqlite.prepare("SELECT sort_order FROM profile_media WHERE id='gallery_a'").get().sort_order,0);assert.ok(objects.has('gallery_a.png'));
      const replacement=(await (await post('gallery_a')).json()).replacement.id;
      assert.equal((await patch(ownerOrder,{order:['gallery_b',replacement]})).status,200);
      assert.equal((await adminAction(replacement,'approve')).status,303);assert.equal(sqlite.prepare("SELECT sort_order FROM profile_media WHERE id='gallery_a'").get().sort_order,1,'approval preserves the chosen gallery position');
      assert.equal((await patch(ownerOrder,{profile:'trash',order:[]})).status,403);assert.equal((await patch(adminOrder,{profile:'off_profile',order:[]})).status,404);
      delete globalThis.__ownerPhotoPermission;
    });
    assert.ok(notifications.length>=3);
  }finally{hooks.deregister();sqlite.close();for(const key of['__ownerPhotoDb','__ownerPhotoUser','__ownerPhotoAdmin','__ownerPhotoBlur','__ownerPhotoBucket','__ownerPhotoAudit','__ownerPhotoNotify'])delete globalThis[key];}
});
