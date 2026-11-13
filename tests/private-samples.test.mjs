import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {PRIVATE_SAMPLES_ENABLED,newSampleToken,sampleTokenHash,sampleFormJson,sampleForm,sampleLink,sampleCookiePath,sampleIsAvailable,SAMPLE_TOKEN,SAMPLE_NO_EXPIRY_AT} from '../lib/private-sample-policy.ts';
const source=p=>readFile(new URL('../'+p,import.meta.url),'utf8');

test('private invitations use random 256-bit fragments, hashes and an isolated cookie path',async()=>{
 assert.equal(PRIVATE_SAMPLES_ENABLED,true);
 const tokens=Array.from({length:100},()=>newSampleToken());assert.equal(new Set(tokens).size,100);
 for(const token of tokens)assert.match(token,SAMPLE_TOKEN);
 const token=tokens[0],id='sam_00000000-0000-4000-8000-000000000000';
 assert.equal(new URL(sampleLink(id,token),'https://chile3x.cl').search,'');
 assert.equal(sampleCookiePath(id),'/muestra/'+id);
 assert.equal((await sampleTokenHash(token)).length,64);assert.notEqual(await sampleTokenHash(token),token);
 assert.equal(await sampleTokenHash('bad'),null);assert.ok(SAMPLE_NO_EXPIRY_AT > Date.now());
});

test('sample persistence excludes credentials, arbitrary keys and review data, preserving bounded profile fields',()=>{
 const form=new FormData();for(const [k,v] of Object.entries({password:'SECRET',mutation_id:'SECRET',review_revision:'42',__proto__:'bad',description:'x'.repeat(5000),promotions:'y'.repeat(600),display_name:'Local sample',type:'agency'}))form.append(k,v);
 form.append('tags','milf');form.append('tags','masajes');form.append('availability_mon_opens','09:00');
 const json=sampleFormJson(form);assert.ok(!json.includes('SECRET'));assert.ok(!json.includes('review_revision'));
 const restored=sampleForm(json);assert.equal(restored.get('type'),'escort');assert.equal(restored.get('intent'),'submit');assert.equal(restored.get('description').length,4000);assert.equal(restored.get('promotions').length,500);assert.deepEqual(restored.getAll('tags'),['milf','masajes']);assert.equal(restored.get('availability_mon_opens'),'09:00');
 for(const json of ['null','{}','[["password","secret"]]','[["age",18]]'])assert.throws(()=>sampleForm(json));
});

test('trash, revocation and completed conversion disable invitation access',()=>{
 const sample={expiresAt:1001,tokenHash:'hash',migratedAt:null};
 assert.equal(sampleIsAvailable(sample),true);assert.equal(sampleIsAvailable({...sample,trashedAt:1001}),false);
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
