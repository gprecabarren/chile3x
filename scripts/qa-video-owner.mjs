// Integration checks against isolated LOCAL fixtures from qa-media-admin.mjs.
// Generate outputs/qa-video-15s.mp4 and qa-video-16s.mp4 with a local encoder.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base = 'http://localhost:3000';
const fixtures = JSON.parse(readFileSync('outputs/qa-media-admin.json', 'utf8'));
assert.match(fixtures.profileId, /^qa_media_[a-f0-9]+_profile$/);
const db = new DatabaseSync(resolve('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite'));
const path = `/api/perfiles/${fixtures.profileId}/media`;
const headers = { cookie: fixtures.ownerCookie, origin: base };
const manifest = 'outputs/qa-video-owner.json';
if (process.argv[2] === 'cleanup') {
  const { mediaId } = JSON.parse(readFileSync(manifest, 'utf8'));
  assert.ok(db.prepare('SELECT id FROM profile_media WHERE id=? AND profile_id=?').get(mediaId, fixtures.profileId));
  const response = await fetch(base + path + '/' + mediaId, { method: 'DELETE', headers });
  assert.equal(response.status, 200);
  console.log('Removed the local generated video through the normal authorized API.');
  db.close();
} else {
const post = async (bytes, name) => {
  const body = new FormData(); body.set('file', new File([bytes], name, { type: 'video/mp4' }));
  const response = await fetch(base + path, { method: 'POST', headers, body });
  return { status: response.status, body: await response.json() };
};
const real = readFileSync('outputs/qa-video-15s.mp4');
// Valid ISO-BMFF free box: exercises the exact final 12 MB boundary without
// changing the real H.264 footage or generating duplicate storage objects.
const free = Buffer.alloc(12_000_000 - real.length);
assert.ok(free.length >= 8); free.writeUInt32BE(free.length, 0); free.write('free', 4);
const accepted = await post(Buffer.concat([real, free]), 'local-15s-12mb.mp4');
assert.equal(accepted.status, 201, JSON.stringify(accepted.body));
const row = db.prepare('SELECT * FROM profile_media WHERE profile_id=?').get(fixtures.profileId);
assert.equal(row.byte_size, 12_000_000); assert.equal(row.moderation_status, 'pending');
assert.equal(db.prepare('SELECT status FROM profiles WHERE id=?').get(fixtures.profileId).status, 'approved');
writeFileSync(manifest, JSON.stringify({ mediaId: row.id }));
const large = await post(new Uint8Array(12_000_001), 'too-large.mp4'); assert.equal(large.status, 400); assert.match(large.body.error, /12 MB/);
const long = await post(readFileSync('outputs/qa-video-16s.mp4'), 'too-long.mp4'); assert.equal(long.status, 400); assert.match(long.body.error, /15 segundos/);
assert.equal(db.prepare('SELECT count(*) AS n FROM profile_media WHERE profile_id=?').get(fixtures.profileId).n, 1);
db.prepare('UPDATE profile_media SET moderation_status=? WHERE id=? AND profile_id=?').run('approved', row.id, fixtures.profileId);
const publicPath = '/perfil/@' + fixtures.prefix;
const foreignCookie = fixtures.adminCookie.replace('chile3x_admin_session=', 'chile3x_user_session=');
for (const type of ['escort', 'rental', 'agency']) {
  db.prepare('UPDATE profiles SET type=? WHERE id=?').run(type, fixtures.profileId);
  for (const [label, cookie, owns] of [['owner', fixtures.ownerCookie, true], ['visitor', foreignCookie, false], ['anonymous', '', false]]) {
    const html = await (await fetch(base + publicPath, { headers: { cookie } })).text();
    assert.equal(html.includes('<aside class="profile-owner-edit-bar"'), owns, type + '/' + label);
    if (owns) assert.ok(html.includes(`/mi-cuenta/${fixtures.profileId}/editar`));
  }
}
db.prepare('UPDATE profiles SET type=? WHERE id=?').run('escort', fixtures.profileId);
assert.equal((await fetch(base + `/mi-cuenta/${fixtures.profileId}/editar`, { headers })).status, 200);
assert.equal((await fetch(base + `/mi-cuenta/${fixtures.profileId}/editar`, { headers: { cookie: foreignCookie } })).status, 404);
db.close();
console.log('PASS: real 15-second/12-MB video saved once; oversized and long clips rejected; editing visible and accessible only to the owner across all listing types.');
}
