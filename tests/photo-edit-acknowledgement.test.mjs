import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {adminMutationResponse} from '../worker/admin-mutation-response.ts';
import {readMediaUploadForm} from '../lib/media-upload-form.ts';
import {uploadMediaRequest} from '../lib/upload-response.ts';
import {isAdminContentPath,ADMIN_CONTENT_SECTIONS} from '../lib/admin-content-navigation.ts';
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const policySource=(await source('lib/photo-edit-policy.ts')).replace('"./face-privacy"',JSON.stringify(new URL('../lib/face-privacy.ts',import.meta.url).href));
const {readPhotoEditOptions,parsePhotoEditOptions,samePhotoEdit}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(policySource)).toString('base64'));
test('photo edit policy validates all coordinates and never accepts coercions or unbounded regions',()=>{
 const options={watermark:true,blur:true,faceRegions:[{x:.1,y:.1,width:.3,height:.4}]};
 assert.deepEqual(parsePhotoEditOptions(JSON.stringify(options)),options);assert.ok(samePhotoEdit(options,options));
 for(const bad of [null,{}, {...options,watermark:'true'},{...options,faceRegions:Array(11).fill(options.faceRegions[0])},...[-1,NaN,Infinity].map(x=>({...options,faceRegions:[{...options.faceRegions[0],x}]}))])assert.equal(readPhotoEditOptions(bad),null);
 assert.deepEqual(readPhotoEditOptions({...options,blur:false}).faceRegions,[]);
 assert.equal(parsePhotoEditOptions('x'.repeat(4001)),null);
});
test('admin AJAX acknowledges redirects without fetching another SSR page; native forms retain redirects and cookies',()=>{
 const req=new Request('https://example.test/api/admin/qa',{method:'POST',headers:{accept:'application/json'}});
 const response=new Response(null,{status:303,headers:{location:'/admin/cuentas','set-cookie':'test=opaque; HttpOnly'}});
 const converted=adminMutationResponse(req,response);assert.equal(converted.status,200);assert.equal(converted.headers.get('set-cookie'),'test=opaque; HttpOnly');assert.equal(converted.headers.get('location'),null);assert.equal(converted.headers.get('cache-control'),'private, no-store');
 for(const request of [new Request(req.url,{method:'POST'}),new Request(req.url),new Request('https://example.test/api/perfiles/qa',{method:'POST',headers:{accept:'application/json'}})])assert.equal(adminMutationResponse(request,response),response);
 const external=new Response(null,{status:303,headers:{location:'https://github.com/login'}});assert.equal(adminMutationResponse(req,external),external);
});
test('streamed multipart parser enforces its envelope bytes, including multiple files',async()=>{
 const data=new FormData();data.set('file',new File([new Uint8Array(100)],'final.jpg'));data.set('original_file',new File([new Uint8Array(200)],'base.jpg'));
 const request=()=>new Request('https://example.test/api/admin/profiles/qa/media',{method:'POST',body:data});
 const result=await readMediaUploadForm(request(),1000,2000);assert.equal(result.get('file').size,100);assert.equal(result.get('original_file').size,200);
 const oversized=request();oversized.headers.set('content-length','2001');await assert.rejects(readMediaUploadForm(oversized,100,200),error=>error.status===413);
});
test('a committed upload with lost response is not described as unsaved and is never retried',async()=>{
 const original=globalThis.fetch,body=new FormData();body.set('mutation_id',crypto.randomUUID());body.set('review_key','profile:p1');let posts=0;
 globalThis.fetch=async(url,init)=>{if(init?.method==='POST'){posts++;throw Error('lost');}return Response.json({committed:true,resourceKey:'profile:p1'});};
 try{await assert.rejects(uploadMediaRequest('/api/admin/media/qa/procesar',body),/quedó guardado.*no repitas/);assert.equal(posts,1);}finally{globalThis.fetch=original;}
});
test('the discarded backup schema is removed only when empty and save receipts are retained',async()=>{
 const db=new DatabaseSync(':memory:');try{
 db.exec('PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);CREATE TABLE profiles(id TEXT PRIMARY KEY);CREATE TABLE profile_media(id TEXT PRIMARY KEY,profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,r2_key TEXT);CREATE TABLE data_deletion_jobs(id TEXT PRIMARY KEY,r2_key TEXT UNIQUE);');
 db.exec(await source('drizzle/0059_reversible_photo_edits_and_mutation_receipts.sql'));
 db.exec("INSERT INTO profiles VALUES('p1');INSERT INTO profile_media VALUES('m1','p1','current');INSERT INTO profile_media_edits(media_id,original_r2_key,original_byte_size,original_content_type) VALUES('m1','private-base',10,'image/jpeg');DELETE FROM profiles WHERE id='p1';");
 assert.equal(db.prepare('SELECT r2_key FROM data_deletion_jobs').get().r2_key,'private-base');assert.equal(db.prepare('SELECT count(*) n FROM profile_media_edits').get().n,0);
 db.exec(await source('drizzle/0061_no_additional_photo_bases.sql'));
 assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='profile_media_edits'").get().n,0);
 assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='admin_mutation_receipts'").get().n,1);
 }finally{db.close();}
});
test('parent deletion atomically queues public photos, stories, verification and report files',async()=>{
 const db=new DatabaseSync(':memory:');try{
 db.exec('PRAGMA foreign_keys=ON;CREATE TABLE profiles(id TEXT PRIMARY KEY);CREATE TABLE profile_media(id TEXT PRIMARY KEY,profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,r2_key TEXT);CREATE TABLE profile_statuses(profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,r2_key TEXT);CREATE TABLE profile_verification_files(profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,r2_key TEXT);CREATE TABLE profile_reports(id TEXT PRIMARY KEY,profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE);CREATE TABLE profile_report_evidence(report_id TEXT REFERENCES profile_reports(id) ON DELETE CASCADE,r2_key TEXT);CREATE TABLE data_deletion_jobs(id TEXT PRIMARY KEY,r2_key TEXT UNIQUE);');
 db.exec(await source('drizzle/0060_profile_storage_cleanup.sql'));
 db.exec("INSERT INTO profiles VALUES('p1'),('other');INSERT INTO profile_media VALUES('m1','p1','photo'),('m2','other','keep');INSERT INTO profile_statuses VALUES('p1','story');INSERT INTO profile_verification_files VALUES('p1','document');INSERT INTO profile_reports VALUES('r1','p1');INSERT INTO profile_report_evidence VALUES('r1','evidence');DELETE FROM profiles WHERE id='p1';");
 assert.deepEqual(db.prepare('SELECT r2_key FROM data_deletion_jobs ORDER BY r2_key').all().map(row=>row.r2_key),['document','evidence','photo','story']);assert.equal(db.prepare('SELECT id FROM profile_media').get().id,'m2');
 }finally{db.close();}
});
test('all content editors belong to one private navigation section',async()=>{
 for(const item of ADMIN_CONTENT_SECTIONS)assert.ok(isAdminContentPath(item.href));assert.ok(isAdminContentPath('/admin/contenido'));assert.equal(isAdminContentPath('/admin/configuracion/correo'),false);
 assert.match(await source('app/admin/contenido/page.tsx'),/privatePageMetadata/);assert.match(await source('app/admin/_components.tsx'),/href="\/admin\/contenido"/);
 const manager=await source('app/mi-cuenta/ProfileMediaManager.tsx');assert.equal((manager.match(/Editar marca y rostros/g)||[]).length,2);
 const login=await source('app/ingresar/page.tsx');assert.match(login,/<PasswordEntry/);assert.match(await source('app/PasswordEntry.tsx'),/aria-pressed/);
 const processor=await source('app/api/admin/media/[mediaId]/procesar/route.ts');assert.doesNotMatch(processor,/profileMediaEdits|originalR2Key|private\/photo-bases/);assert.match(processor,/additionalOriginalStored:false/);
});
