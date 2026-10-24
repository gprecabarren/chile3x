import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import { drizzle } from 'drizzle-orm/d1';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { eq } from 'drizzle-orm';
import { adminDisplayLogin } from '../lib/admin-presentation.ts';

test('the private display exception is tied to one immutable internal administrator only',()=>{
  assert.equal(adminDisplayLogin({id:'usr_admin_b8d25f66-47b4-4fbb-8a74-39b863d12513',githubLogin:'benjaminmartinezjeldres'}),'b');
  assert.equal(adminDisplayLogin({id:'different',githubLogin:'benjaminmartinezjeldres'}),'benjaminmartinezjeldres');
  assert.equal(adminDisplayLogin({id:'owner',githubLogin:'gprecabarren'}),'gprecabarren');
});

test('real SQLite transactions exercise stale reviews, simultaneous saves, owner edits, reservations and rollback',async t=>{
  const sqlite=new DatabaseSync(':memory:');let mails=0,audits=0;
  const prepare=(query,args=[])=>({bind:(...values)=>prepare(query,values),execute(){const statement=sqlite.prepare(query);if(statement.columns().length)return {results:statement.all(...args)};const result=statement.run(...args);return {results:[],meta:{changes:Number(result.changes)}};},async all(){return this.execute();},async raw(){const statement=sqlite.prepare(query);statement.setReturnArrays(true);return statement.all(...args);}});
  globalThis.__collaborationTestDb=drizzle({prepare,async batch(statements){sqlite.exec('BEGIN');try{const values=statements.map(statement=>statement.execute());sqlite.exec('COMMIT');return values;}catch(error){sqlite.exec('ROLLBACK');throw error;}}});
  globalThis.__collaborationTestAdmin={id:'admin_a',githubLogin:'administrator_a',email:'a@example.invalid',displayName:'Administrator A',accessLevel:'administrator'};
  globalThis.__collaborationTestMail=()=>{mails++;return true;};globalThis.__collaborationTestAudit=()=>{audits++;return true;};
  const hooks=registerHooks({resolve(specifier,context,next){
    const stubs={
      '@/db':'export const getDb=async()=>globalThis.__collaborationTestDb;',
      '@/lib/auth':'export const getCurrentAdmin=async()=>globalThis.__collaborationTestAdmin;export const assertSameOrigin=()=>{};',
      '@/lib/account-email':'export const sendPortalEmail=async()=>globalThis.__collaborationTestMail();',
      '@/lib/admin-audit':'export const recordAdminAudit=async()=>globalThis.__collaborationTestAudit();',
      '@/lib/site-settings':'export const getSiteSettings=async()=>({site_url:"https://example.invalid"});export const siteBaseUrl=v=>v;',
      '@/lib/profile-city-alerts':'export const notifyProfileCitySubscribers=async()=>0;',
    };
    if(stubs[specifier])return {url:'data:text/javascript,'+encodeURIComponent(stubs[specifier]),shortCircuit:true};
    if(specifier==='next/server')return next('next/server.js',context);
    if(specifier.startsWith('@/'))return {url:new URL('../'+specifier.slice(2)+'.ts',import.meta.url).href,shortCircuit:true};
    return next(specifier,context);
  }});
  try{
    const schema=await import('../db/schema.ts');
    for(const table of Object.values(schema)){
      let config;try{config=getTableConfig(table);}catch{continue;}
      if(['collaboration_guards','review_reservations','settings_revision'].includes(config.name))continue;
      // Start at the pre-migration schema; the actual migration adds versions.
      sqlite.exec(`CREATE TABLE IF NOT EXISTS "${config.name}" (${config.columns.filter(column=>column.name!=='revision').map(column=>`"${column.name}" ${column.getSQLType()}${column.primary?' PRIMARY KEY':''}`).join(',')})`);
    }
    sqlite.exec(await readFile(new URL('../drizzle/0056_admin_collaboration.sql',import.meta.url),'utf8'));
    sqlite.exec("INSERT INTO users(id,email,display_name,is_active,role) VALUES('owner','owner@example.invalid','Alias',1,'advertiser'),('admin_a','a@example.invalid','Admin A',1,'admin'),('admin_b','b@example.invalid','Admin B',1,'admin');INSERT INTO profiles(id,owner_id,type,status,display_name,slug,health_review_status,verification_status,is_featured) VALUES('p1','owner','escort','pending','QA 1','qa-1','not_requested','unreviewed',0),('p2','owner','escort','pending','QA 2','qa-2','not_requested','unreviewed',0);INSERT INTO profile_details(profile_id,metadata) VALUES('p1','{\"age\":\"23\"}');");
    const {guardedBatch,currentRevision,CollaborationConflict,expectedVersion}=await import('../lib/collaboration.ts');
    const db=globalThis.__collaborationTestDb;
    await t.test('save receipts commit atomically, identify the actor, and never survive a rejected transaction',async()=>{
      const id=crypto.randomUUID(),version={key:'profile:p1',revision:await currentRevision('profile:p1'),mutationId:id};
      const result=await guardedBatch(version,[db.update(schema.profiles).set({city:'receipt test'}).where(eq(schema.profiles.id,'p1'))],'admin_a');assert.equal(result.length,1);
      assert.deepEqual(sqlite.prepare('SELECT actor_id,resource_key FROM admin_mutation_receipts WHERE id=?').get(id),Object.assign(Object.create(null),{actor_id:'admin_a',resource_key:'profile:p1'}));
      const failed=crypto.randomUUID();await assert.rejects(guardedBatch({...version,mutationId:failed},[db.update(schema.profiles).set({city:'must not save'}).where(eq(schema.profiles.id,'p1'))],'admin_b'),CollaborationConflict);
      assert.equal(sqlite.prepare('SELECT id FROM admin_mutation_receipts WHERE id=?').get(failed),undefined);
      const {GET}=await import('../app/api/admin/colaboracion/confirmacion/route.ts');
      const request=new Request('https://example.invalid/api/admin/colaboracion/confirmacion?id='+id);
      assert.equal((await(await GET(request)).json()).committed,true);
      const original=globalThis.__collaborationTestAdmin;globalThis.__collaborationTestAdmin={...original,id:'admin_b'};
      assert.deepEqual(await(await GET(request)).json(),{committed:false,resourceKey:null});
      globalThis.__collaborationTestAdmin=null;assert.equal((await GET(request)).status,401);globalThis.__collaborationTestAdmin=original;
    });
    await t.test('only one administrator can save the same reviewed version',async()=>{
      const version={key:'profile:p1',revision:await currentRevision('profile:p1')};
      const results=await Promise.allSettled([
        guardedBatch(version,[db.update(schema.profiles).set({status:'approved'}).where(eq(schema.profiles.id,'p1'))],'admin_a'),
        guardedBatch(version,[db.update(schema.profiles).set({status:'rejected'}).where(eq(schema.profiles.id,'p1'))],'admin_b'),
      ]);
      assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.ok(results.find(result=>result.status==='rejected').reason instanceof CollaborationConflict);
      assert.equal(sqlite.prepare("SELECT status FROM profiles WHERE id='p1'").get().status,'approved');
      assert.equal(sqlite.prepare('SELECT count(*) n FROM collaboration_guards').get().n,0);
    });
    await t.test('unrelated records can be changed by different administrators',async()=>{
      const a={key:'profile:p1',revision:await currentRevision('profile:p1')},b={key:'profile:p2',revision:await currentRevision('profile:p2')};
      await Promise.all([guardedBatch(a,[db.update(schema.profiles).set({city:'A'}).where(eq(schema.profiles.id,'p1'))],'admin_a'),guardedBatch(b,[db.update(schema.profiles).set({city:'B'}).where(eq(schema.profiles.id,'p2'))],'admin_b')]);
    });
    await t.test('owner edits invalidate administrative reviews including their dependent fields',async()=>{
      const version={key:'profile:p1',revision:await currentRevision('profile:p1')};
      sqlite.exec("UPDATE profile_details SET metadata='{\"age\":\"24\"}' WHERE profile_id='p1'");
      await assert.rejects(guardedBatch(version,[db.update(schema.profiles).set({status:'approved'}).where(eq(schema.profiles.id,'p1'))],'admin_b'),CollaborationConflict);
    });
    await t.test('a late failure rolls the whole edit back, including its guard and version',async()=>{
      const version={key:'profile:p2',revision:await currentRevision('profile:p2')};
      await assert.rejects(guardedBatch(version,[db.update(schema.profiles).set({city:'must rollback'}).where(eq(schema.profiles.id,'p2')),db.insert(schema.collaborationGuards).values({id:'failure',allowed:0})],'admin_a'),CollaborationConflict);
      assert.equal(await currentRevision('profile:p2'),version.revision);assert.equal(sqlite.prepare("SELECT city FROM profiles WHERE id='p2'").get().city,'B');
    });
    await t.test('reservations block other administrators, expire, and do not block the owner',async()=>{
      const version={key:'profile:p2',revision:await currentRevision('profile:p2')};
      sqlite.prepare('INSERT INTO review_reservations VALUES(?,?,?,?)').run(version.key,'admin_a','lease',Date.now()+10000);
      await assert.rejects(guardedBatch(version,[db.update(schema.profiles).set({city:'blocked'}).where(eq(schema.profiles.id,'p2'))],'admin_b'),CollaborationConflict);
      await guardedBatch(version,[db.update(schema.profiles).set({city:'owner edit'}).where(eq(schema.profiles.id,'p2'))]);
      sqlite.exec('UPDATE review_reservations SET expires_at=0');
      await guardedBatch({key:'profile:p2',revision:await currentRevision('profile:p2')},[db.update(schema.profiles).set({city:'after expiry'}).where(eq(schema.profiles.id,'p2'))],'admin_b');
    });
    await t.test('new or replaced files invalidate both gallery and account confirmations',async()=>{
      const profileVersion=await currentRevision('profile:p1'),accountVersion=await currentRevision('account:owner');
      sqlite.exec("INSERT INTO profile_media(id,profile_id,r2_key,moderation_status) VALUES('m1','p1','first','pending')");
      assert.ok(await currentRevision('profile:p1')>profileVersion);assert.ok(await currentRevision('account:owner')>accountVersion);
      const version=await currentRevision('profile:p1');sqlite.exec("UPDATE profile_media SET r2_key='replacement' WHERE id='m1'");assert.ok(await currentRevision('profile:p1')>version);
    });
    await t.test('missing, malformed and cross-record snapshots are rejected',()=>{
      assert.throws(()=>expectedVersion(new FormData(),'profile:p1'),CollaborationConflict);const form=new FormData();form.set('review_key','profile:p2');form.set('review_revision','0');assert.throws(()=>expectedVersion(form,'profile:p1'),CollaborationConflict);
    });
    await t.test('real approval route rejects replay and sends only one approval email',async()=>{
      sqlite.exec("UPDATE profiles SET status='pending' WHERE id='p1'");const revision=await currentRevision('profile:p1');
      const {POST}=await import('../app/api/admin/profiles/[profileId]/status/route.ts');
      const request=()=>{const form=new FormData();for(const [key,value]of Object.entries({review_key:'profile:p1',review_revision:String(revision),status:'approved',verification_status:'unreviewed',health_review_status:'not_requested'}))form.set(key,value);return new Request('https://example.invalid/api/admin/profiles/p1/status',{method:'POST',body:form});};
      assert.equal((await POST(request(),{params:Promise.resolve({profileId:'p1'})})).status,303);
      globalThis.__collaborationTestAdmin={...globalThis.__collaborationTestAdmin,id:'admin_b',githubLogin:'administrator_b'};
      assert.equal((await POST(request(),{params:Promise.resolve({profileId:'p1'})})).status,409);assert.equal(mails,1);assert.equal(audits,1);
    });
  }finally{hooks.deregister();sqlite.close();delete globalThis.__collaborationTestDb;delete globalThis.__collaborationTestAdmin;delete globalThis.__collaborationTestMail;delete globalThis.__collaborationTestAudit;}
});

test('storage reads avoid D1 compound SELECT limits and UI keeps conflicts in place',async()=>{
 const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
 assert.doesNotMatch((await read('lib/media.ts')).split('export async function getMediaUsage()')[1].split('export async function getApprovedMediaForProfiles')[0],/UNION ALL/);
 const client=await read('app/AdminCollaboration.tsx');assert.match(client,/pending\.has\(form\)/);assert.match(client,/visibilityState!=='visible'/);assert.match(client,/30_000/);assert.match(client,/if\(!response.ok\)/);assert.match(client,/previous===REFRESH_FAILURE_MESSAGE\?'':previous/);assert.doesNotMatch(client,/form\.reset\(|setInterval\([^,]+,\s*[1-9]_000/);
});

test('streamed render failures have independent recovery screens and bounded private diagnostics',async()=>{
 const {onRequestError}=await import('../instrumentation.ts');const previous=console.error;let logged;
 console.error=(...values)=>{logged=values;};
 try{onRequestError(new Error('select failed\nparams: secret@example.invalid',{cause:new Error('cause for person@example.invalid')}),{path:'/admin/cuentas/test?token=private'},{routePath:'/admin/cuentas/[userId]'});}finally{console.error=previous;}
 const output=JSON.stringify(logged);assert.match(output,/Portal render failed/);assert.doesNotMatch(output,/secret|person@example|token=private/);
 for(const path of ['app/admin/error.tsx','app/error.tsx','app/global-error.tsx']){const source=await readFile(new URL('../'+path,import.meta.url),'utf8');assert.match(source,/role="alert"/);assert.match(source,path.includes('global-error')?/location\.reload\(\)/:/onClick=\{reset\}/);assert.doesNotMatch(source,/error\.message/);}
});
