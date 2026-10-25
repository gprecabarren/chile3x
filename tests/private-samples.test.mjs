import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {PRIVATE_SAMPLES_ENABLED,newSampleToken,sampleTokenHash,sampleFormJson,sampleForm,sampleLink,sampleCookiePath,sampleIsAvailable,SAMPLE_TOKEN,SAMPLE_LIFETIME_MS,SAMPLE_RETENTION_MS} from '../lib/private-sample-policy.ts';
const source=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('private invitations use random 256-bit fragments, hashes and an isolated cookie path',async()=>{
 assert.equal(PRIVATE_SAMPLES_ENABLED,true);
 const tokens=Array.from({length:100},()=>newSampleToken());assert.equal(new Set(tokens).size,100);
 for(const token of tokens)assert.match(token,SAMPLE_TOKEN);
 const token=tokens[0],id='sam_00000000-0000-4000-8000-000000000000';
 assert.equal(new URL(sampleLink(id,token),'https://chile3x.cl').search,'');
 assert.equal(sampleCookiePath(id),'/muestra/'+id);
 assert.equal((await sampleTokenHash(token)).length,64);assert.notEqual(await sampleTokenHash(token),token);
 assert.equal(await sampleTokenHash('bad'),null);assert.equal(SAMPLE_LIFETIME_MS,7*86400000);
});

test('sample persistence excludes credentials, arbitrary keys and review data, preserving bounded profile fields',()=>{
 const form=new FormData();for(const [k,v] of Object.entries({password:'SECRET',mutation_id:'SECRET',review_revision:'42',__proto__:'bad',description:'x'.repeat(5000),promotions:'y'.repeat(600),display_name:'Local sample',type:'agency'}))form.append(k,v);
 form.append('tags','milf');form.append('tags','masajes');form.append('availability_mon_opens','09:00');
 const json=sampleFormJson(form);assert.ok(!json.includes('SECRET'));assert.ok(!json.includes('review_revision'));
 const restored=sampleForm(json);assert.equal(restored.get('type'),'escort');assert.equal(restored.get('intent'),'submit');assert.equal(restored.get('description').length,4000);assert.equal(restored.get('promotions').length,500);assert.deepEqual(restored.getAll('tags'),['milf','masajes']);assert.equal(restored.get('availability_mon_opens'),'09:00');
 for(const json of ['null','{}','[["password","secret"]]','[["age",18]]'])assert.throws(()=>sampleForm(json));
});

test('expiration, revocation and completed conversion disable invitation access',()=>{
 const sample={expiresAt:1001,tokenHash:'hash',migratedAt:null};
 assert.equal(sampleIsAvailable(sample,1000),true);assert.equal(sampleIsAvailable(sample,1001),false);
 assert.equal(sampleIsAvailable({...sample,tokenHash:null},1000),false);assert.equal(sampleIsAvailable({...sample,migratedAt:'done'},1000),false);
});

test('sample and media edits invalidate old review snapshots in actual SQLite',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec('PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);CREATE TABLE profiles(id TEXT PRIMARY KEY);INSERT INTO users VALUES("admin");'.replaceAll('"',"'"));
  await source('drizzle/0062_private_profile_samples.sql').then(sql=>db.exec(sql));
  db.exec("INSERT INTO private_profile_samples(id,display_name,form_json,expires_at,created_by) VALUES('sample','Local','[]',1,'admin');");
  assert.equal(db.prepare('SELECT revision FROM private_profile_samples').get().revision,0);
  db.exec("UPDATE private_profile_samples SET display_name='Updated';INSERT INTO private_sample_media VALUES('media','sample','private-key',1,'image/png','image',1,0);");
  assert.equal(db.prepare('SELECT revision FROM private_profile_samples').get().revision,2);
  db.exec("DELETE FROM private_sample_media;");assert.equal(db.prepare('SELECT revision FROM private_profile_samples').get().revision,3);
 }finally{db.close();}
});

test('expired sample cleanup atomically queues only privately owned files and respects concurrent renewal',async()=>{
 const hooks=registerHooks({resolve(specifier,context,next){if(specifier==='../lib/private-sample-policy')return {url:new URL('../lib/private-sample-policy.ts',import.meta.url).href,shortCircuit:true};return next(specifier,context);}});
 try{
  const {purgeExpiredSamples}=await import('../worker/private-sample-cleanup.ts');
  const sqlite=new DatabaseSync(':memory:');
  try{
   sqlite.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY);CREATE TABLE profiles(id TEXT PRIMARY KEY,owner_id TEXT,type TEXT,trashed_at TEXT,creation_source TEXT,created_by_admin_id TEXT);CREATE TABLE profile_media(r2_key TEXT);INSERT INTO users VALUES('admin');CREATE TABLE data_deletion_jobs(id TEXT PRIMARY KEY,r2_key TEXT UNIQUE,created_at TEXT);");
   sqlite.exec(await source('drizzle/0062_private_profile_samples.sql'));
   sqlite.exec(await source('drizzle/0064_private_sample_workflow.sql'));
   const now=Date.now(),old=now-SAMPLE_RETENTION_MS-1;
   for(const [id,expires] of [['expired',old],['renewed',old],['active',now+1000]])sqlite.prepare('INSERT INTO private_profile_samples(id,display_name,form_json,expires_at,created_by) VALUES(?,?,?,?,?)').run(id,id,'[]',expires,'admin');
   for(const id of ['expired','renewed','active'])sqlite.prepare('INSERT INTO private_sample_media VALUES(?,?,?,?,?,?,?,?)').run(id+'-file',id,id+'-key',10,'image/png','image',1,0);
   let renewed=false;
   const prepare=(sql,args=[])=>({bind:(...values)=>prepare(sql,values),async all(){return {results:sqlite.prepare(sql).all(...args)};},run(){const result=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(result.changes)}};}});
   const binding={prepare,async batch(statements){if(!renewed){sqlite.prepare('UPDATE private_profile_samples SET expires_at=?,trashed_at=NULL,trash_reason=NULL WHERE id=?').run(now+1000,'renewed');renewed=true;}sqlite.exec('BEGIN');try{const result=statements.map(s=>s.run());sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
   await purgeExpiredSamples(binding,now);
   assert.deepEqual(sqlite.prepare('SELECT id FROM private_profile_samples ORDER BY id').all().map(r=>r.id),['active','renewed']);
   assert.deepEqual(sqlite.prepare('SELECT r2_key FROM data_deletion_jobs').all().map(r=>r.r2_key),['expired-key']);
  }finally{sqlite.close();}
 }finally{hooks.deregister();}
});

test('private presentation omits analytics, public structured data and shared cache entries',async()=>{
 const [worker,page,access,layout]=await Promise.all(['worker/index.ts','app/muestra/[sampleId]/page.tsx','app/muestra/[sampleId]/acceso/route.ts','app/layout.tsx'].map(source));
 assert.match(worker,/requestHeaders.delete\(PRIVATE_SAMPLE_HEADER\)/);assert.match(worker,/noimageindex/);assert.match(worker,/connect-src 'self'"/);
 assert.match(page,/canOpenSample/);assert.match(page,/canonical:null/);assert.match(access,/HttpOnly; SameSite=Lax/);assert.match(access,/>512/);
 assert.ok(layout.indexOf('if(requestHeaders.get(PRIVATE_SAMPLE_HEADER)')<layout.indexOf('<DeferredClientFeatures'));
 assert.match(await source('app/perfil/[slug]/page.tsx'),/!sample && <Suspense/);
 assert.match(await source('app/api/admin/operaciones/almacenamiento/route.ts'),/from\(privateSampleMedia\)/);
});

test('conversion transfers ownership without duplicating objects or granting identity verification',async()=>{
 const library=await source('lib/private-samples.ts'),upload=await source('lib/private-sample-media.ts');
 assert.match(library,/await guardedBatch\(version,\s*\[/);assert.match(library,/verificationStatus:\s*"unreviewed"/);assert.match(library,/r2Key:\s*file.r2Key/);assert.match(library,/db.delete\(privateSampleMedia\)/);assert.match(library,/emailVerifiedAt/);
 assert.doesNotMatch(library,/\.MEDIA\.(?:put|delete)/);
 assert.match(upload,/row\?\.inUse\s*===\s*0/);assert.match(upload,/profile_media where r2_key/);assert.match(upload,/sample_media_cleanup_deferred/);
 assert.match(upload,/validatePreparedVideo\(await file.arrayBuffer\(\),\s*video\)/);
});

test('account invitation forms let long native selects shrink instead of clipping their mobile actions',async()=>{
 const css=await source('app/modern-controls.css');
 assert.match(css,/\.agency-invite-form :is\(input,select\) \{ width:100%; min-width:0; max-width:100%; \}/);
 assert.match(css,/@media\(max-width:760px\) \{ \.agency-invite-form \{ grid-template-columns:minmax\(0,1fr\); \} \}/);
 assert.match(css,/\.account-details-form \.account-identity-optional \.form-grid > label \{ align-content:start; gap:7px; \}/);
 assert.match(css,/\.account-details-form \.account-identity-optional :is\(input,select\) \{ height:46px; min-height:46px; margin:0; \}/);
});
