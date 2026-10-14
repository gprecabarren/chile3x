import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { stripTypeScriptTypes } from 'node:module';
import { publicProfileAge } from '../lib/profile-age.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const policySource=source('lib/forum-community-policy.ts').replace('"./forum-policy"',JSON.stringify(new URL('../lib/forum-policy.ts',import.meta.url).href));
const policy=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(policySource)).toString('base64'));
test('age displays only genuine adult escort data, without guessing or touching other announcement types',()=>{
 assert.equal(publicProfileAge('escort',{age:'25'}),25);
 for(const age of ['','17','100','28 años','25.5','0','NaN'])assert.equal(publicProfileAge('escort',{age}),null);
 assert.equal(publicProfileAge('agency',{age:'25'}),null);assert.equal(publicProfileAge('rental',{age:'25'}),null);
 assert.equal(publicProfileAge('escort',{}),null);
 assert.match(source('app/directorio/_components.tsx'),/public-card-age.*\{age\}/);
 assert.match(source('app/perfil/[slug]/page.tsx'),/profile-heading-age.*\{age\}/);
});
test('community migration is additive and installs the exact versioned rules',()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec('CREATE TABLE users(id TEXT PRIMARY KEY);CREATE TABLE forum_posts(id TEXT PRIMARY KEY);CREATE TABLE forum_topics(id TEXT PRIMARY KEY)');
  const migration=source('drizzle/0049_forum_community.sql');assert.doesNotMatch(migration,/ALTER TABLE|DELETE FROM|UPDATE profiles/);
  db.exec(migration);db.exec(source('drizzle/0050_forum_decision_claim.sql'));
  assert.equal(db.prepare("SELECT rules FROM forum_settings WHERE id='global'").get().rules.replaceAll('\r\n','\n'),policy.FORUM_DEFAULT_RULES.replaceAll('\r\n','\n'));
  assert.ok(db.prepare('PRAGMA table_info(forum_reports)').all().some(row=>row.name==='decision_token'));
 }finally{db.close();}
});
test('atomic persisted rate limits cap parallel attempts and recover after the window',async()=>{
 const db=new DatabaseSync(':memory:');try{
  db.exec('CREATE TABLE forum_rate_limits(key TEXT PRIMARY KEY,window_start INTEGER,hits INTEGER,updated_at TEXT)');
  const prepare=(sql,values=[])=>({bind:(...args)=>prepare(sql,args),async run(){return {meta:{changes:db.prepare(sql).run(...values).changes}};}});
  const now=Date.now(),DB={prepare};
  const attempts=await Promise.allSettled(Array.from({length:30},()=>policy.claimForumRate(DB,'qa','upload',now)));
  assert.equal(attempts.filter(row=>row.status==='fulfilled').length,6);
  assert.ok(attempts.filter(row=>row.status==='rejected').every(row=>row.reason.status===429));
  await policy.claimForumRate(DB,'qa','upload',now+60_000);
  await policy.claimForumRate(DB,'other','upload',now);
  await policy.claimForumRate(DB,'qa','publish',now);
  await assert.rejects(policy.claimForumRate(DB,'qa','publish',now+1),{status:429});
 }finally{db.close();}
});
test('report motives cannot use inherited object properties',()=>{for(const value of ['constructor','toString','__proto__','',null])assert.throws(()=>policy.forumReportReason(value));assert.equal(policy.forumReportReason('privacy'),'privacy');});
test('new private forum pages authenticate first; streams and uploads stay bounded and private',()=>{
 for(const path of ['normas','notificaciones','moderacion']){const text=source(`app/foro/${path}/page.tsx`);assert.ok(text.indexOf('await requireForumAdmin()')<text.indexOf('await getForum'));}
 const upload=source('app/api/admin/foro/adjuntos/[postId]/route.ts');assert.ok(upload.indexOf('await getCurrentAdmin()')<upload.indexOf('await readMediaUploadForm'));assert.match(upload,/FORUM_ATTACHMENT_BYTES/);assert.match(upload,/INSERT INTO forum_attachments/);
 const file=source('app/foro/adjunto/[attachmentId]/route.ts');assert.ok(file.indexOf('adminHasCapability')<file.indexOf('const {attachmentId}'));assert.match(file,/private, no-store/);assert.match(file,/mediaByteRange/);assert.match(file,/new Response\(object.body/);
 const stories=source('app/historias/StoryRail.tsx');assert.match(stories,/Ver historias de.*desde actividad/);assert.match(stories,/directory-activity-footer/);assert.match(stories,/scrollIntoView/);
});
