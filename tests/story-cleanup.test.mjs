import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { purgeExpiredStoryRecords } from '../worker/story-cleanup.ts';
import { MAX_STORY_IMAGE_BYTES, storyLimitForType } from '../lib/story-data.ts';
import { MAX_PREPARED_VIDEO_BYTES, MAX_VIDEO_SECONDS } from '../lib/video-policy.ts';
const now='2026-10-14T05:00:00.000Z';
function setup() {
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE profile_statuses(id TEXT PRIMARY KEY,r2_key TEXT,created_at TEXT,expires_at TEXT)');
  const DB = { prepare(sql) { return { bind(...values) {
    assert.ok(values.length <= 100);
    return { all: async () => ({ results: db.prepare(sql).all(...values) }), run: async () => ({ meta: { changes: db.prepare(sql).run(...values).changes } }) };
  } }; } };
  const insert=(id,key=null,expires='2026-10-13T05:00:00.000Z')=>db.prepare('INSERT INTO profile_statuses VALUES(?,?,?,?)').run(id,key,'2026-10-12T05:00:00.000Z',expires);
  return {db,DB,insert};
}
test('cleanup removes expired photos/videos/text and legacy rows, preserving active rows', async()=>{
  const {db,DB,insert}=setup();
  try {
    insert('text');insert('image','stories/test/image.jpg');insert('video','stories/test/video.mp4');insert('legacy',null,null);insert('active','stories/active.jpg','2026-10-15T05:00:00.000Z');
    const keys=[];const result=await purgeExpiredStoryRecords({DB,MEDIA:{delete:async list=>keys.push(...list)}},now);
    assert.equal(result.removed,4);assert.equal(result.mediaRemoved,2);assert.equal(result.retryNeeded,false);
    assert.deepEqual(keys.sort(),['stories/test/image.jpg','stories/test/video.mp4']);assert.deepEqual(db.prepare('SELECT id FROM profile_statuses').all().map(row=>row.id),['active']);
  } finally {db.close();}
});
test('storage failure retains its database pointers for retry; text deletion remains safe',async()=>{
  const {db,DB,insert}=setup();
  try {
    insert('text');insert('image','stories/test.jpg');
    const failed=await purgeExpiredStoryRecords({DB,MEDIA:{delete:async()=>{throw Error('temporary storage failure');}}},now);
    assert.equal(failed.removed,1);assert.equal(failed.retryNeeded,true);assert.equal(db.prepare('SELECT count(*) AS n FROM profile_statuses').get().n,1);
    const retry=await purgeExpiredStoryRecords({DB,MEDIA:{delete:async()=>{}}},now);assert.equal(retry.removed,1);assert.equal(retry.retryNeeded,false);
  } finally {db.close();}
});
test('cleanup is bounded and remains within D1 parameter limits',async()=>{
  const {db,DB,insert}=setup();
  try {
    for(let i=0;i<500;i++)insert('text-'+i);
    assert.equal((await purgeExpiredStoryRecords({DB},now)).removed,450);
    assert.equal((await purgeExpiredStoryRecords({DB},now)).removed,50);
    assert.equal((await purgeExpiredStoryRecords({DB},now)).removed,0);
  } finally {db.close();}
});
test('story policies share bounded final-file limits and scheduled lifecycle across roles',()=>{
  assert.equal(MAX_STORY_IMAGE_BYTES,5_000_000);assert.equal(storyLimitForType('text'),5);assert.equal(storyLimitForType('image'),5);assert.equal(storyLimitForType('video'),3);
  assert.equal(MAX_PREPARED_VIDEO_BYTES,12_000_000);assert.equal(MAX_VIDEO_SECONDS,15);
  const read=path=>readFileSync(path,'utf8');
  for(const path of ['app/api/historias/route.ts','app/api/admin/profiles/[profileId]/historias/route.ts']) {const code=read(path);assert.match(code,/readStoryUpload/);assert.match(code,/storyLimitForType/);assert.match(code,/expires_at > \?\) < \?/);}
  assert.match(read('lib/story-upload.ts'),/validatePreparedVideo\(data, contentType\)/);
  assert.match(read('worker/index.ts'),/purgeExpiredStoryRecords\(env\)/);
  assert.match(read('app/historias/StoryRail.tsx'),/story.storyType === "video"\) return/);
  assert.match(read('app/historias/StoryRail.tsx'),/onEnded=/);
  assert.match(read('app/historias/[storyId]/media/route.ts'),/range \? 206 : 200/);
});
