// Local-only integration checks. Uses the temporary qa-media-admin fixtures.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base = process.env.QA_LOCAL_BASE ?? 'http://localhost:3000';
assert.ok(['http://localhost:3000','http://127.0.0.1:8788'].includes(base));
const manifest = 'outputs/qa-media-admin.json';
const fixtures = JSON.parse(readFileSync(manifest, 'utf8'));
assert.ok(fixtures.prefix.startsWith('qa_media_'));
const database = resolve('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(database.startsWith(resolve('.wrangler/visual-state') + '\\'));
const db = new DatabaseSync(database);
const row = db.prepare('SELECT owner_id,handle FROM profiles WHERE id=?').get(fixtures.profileId);
assert.equal(row.owner_id, fixtures.owner);
const get = (path, cookie) => fetch(base + path, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
const foreignCookie = fixtures.adminCookie.replace('chile3x_admin_session=', 'chile3x_user_session=');
function removeCoreDrafts() {
  for (const id of fixtures.coreDraftIds ?? []) {
    const draft = db.prepare('SELECT owner_id,display_name FROM profiles WHERE id=?').get(id);
    if (!draft) continue;
    assert.equal(draft.owner_id, fixtures.owner); assert.ok(draft.display_name.startsWith(fixtures.prefix));
    db.prepare('DELETE FROM profiles WHERE id=? AND owner_id=?').run(id, fixtures.owner);
  }
  fixtures.coreDraftIds = []; writeFileSync(manifest, JSON.stringify(fixtures));
}
try {
removeCoreDrafts();
if (process.argv[2] === 'cleanup-media') {
  for (const { id } of db.prepare('SELECT id FROM profile_media WHERE profile_id=?').all(fixtures.profileId)) {
    const response = await fetch(`${base}/api/perfiles/${fixtures.profileId}/media/${id}`, { method: 'DELETE', headers: { cookie: fixtures.ownerCookie, origin: base } });
    assert.equal(response.status, 200);
  }
  console.log('Removed only the temporary local preview media from R2 and D1.');
  fixtures.previewMediaIds = []; writeFileSync(manifest, JSON.stringify(fixtures));
} else if (process.argv[2] === 'cleanup-fixtures') {
  assert.equal(db.prepare('SELECT count(*) AS n FROM profile_media WHERE profile_id=?').get(fixtures.profileId).n, 0, 'Delete local R2 media first');
  const ids = [fixtures.admin, fixtures.owner];
  for (const id of ids) assert.ok(id.startsWith(fixtures.prefix));
  db.exec('PRAGMA foreign_keys=ON');
  db.prepare('DELETE FROM admin_audit_logs WHERE actor_user_id IN (?,?)').run(...ids);
  db.prepare('DELETE FROM admin_github_access WHERE user_id=?').run(fixtures.admin);
  db.prepare('DELETE FROM profiles WHERE id=? AND owner_id=?').run(fixtures.profileId, fixtures.owner);
  for (const id of ids) db.prepare('DELETE FROM users WHERE id=?').run(id);
  assert.equal(db.prepare('SELECT count(*) AS n FROM users WHERE id IN (?,?)').get(...ids).n, 0);
  console.log('Removed only the local QA accounts, listing and fixture library rows.');
} else {
  db.prepare("UPDATE profiles SET status='draft', short_description='Vista previa local', description='Descripción de prueba local, no es un anuncio real.', contact_whatsapp='56912345678' WHERE id=?").run(fixtures.profileId);
  if (!fixtures.previewMediaIds?.length) {
    fixtures.previewMediaIds = [];
    for (const kind of ['profile_photo', 'gallery']) {
      const data = new FormData(); data.set('upload_kind', kind);
      data.set('file', new File([readFileSync('public/favicon-192.png')], `qa-preview-${kind}.png`, { type: 'image/png' }));
      const response = await fetch(`${base}/api/perfiles/${fixtures.profileId}/media`, { method: 'POST', headers: { cookie: fixtures.ownerCookie, origin: base }, body: data });
      const payload = await response.json(); assert.equal(response.status, 201, payload.error);
      assert.equal(payload.media.moderationStatus, 'pending'); fixtures.previewMediaIds.push(payload.media.id);
      writeFileSync(manifest, JSON.stringify(fixtures));
    }
  }
  const path = `/perfil/@${row.handle}`;
  for (const type of ['escort', 'agency', 'rental']) {
    for (const status of ['draft', 'pending', 'paused', 'rejected', 'expired']) {
      db.prepare('UPDATE profiles SET type=?, status=?, owner_hidden_at=NULL WHERE id=?').run(type, status, fixtures.profileId);
      const response = await get(path, fixtures.ownerCookie), html = await response.text();
      assert.equal(response.status, 200, `${type}/${status}: owner access`);
      assert.ok(html.includes('Vista previa privada'));
      assert.match(html, /name="robots" content="[^"]*noindex/);
      assert.ok(!html.includes('"@type":"Person"') && !html.includes('"@type":"Accommodation"'));
      for (const id of fixtures.previewMediaIds) assert.ok(html.includes(`/media/${id}`), 'pending media appears privately');
      assert.equal((await get(path)).status, 404, `${type}/${status}: anonymous denied`);
      assert.equal((await get(path, foreignCookie)).status, 404, `${type}/${status}: other account denied`);
      assert.equal((await get(path, fixtures.adminCookie)).status, 200, `${type}/${status}: admin access`);
    }
  }
  db.prepare("UPDATE profiles SET type='escort', status='approved', owner_hidden_at=? WHERE id=?").run(new Date().toISOString(), fixtures.profileId);
  assert.equal((await get(path)).status, 404); assert.equal((await get(path, fixtures.ownerCookie)).status, 200);
  for (const id of fixtures.previewMediaIds) {
    assert.equal((await get(`/media/${id}`)).status, 404);
    assert.equal((await get(`/media/${id}`, foreignCookie)).status, 404);
    assert.equal((await get(`/media/${id}`, fixtures.ownerCookie)).status, 200);
    assert.equal((await get(`/media/${id}`, fixtures.adminCookie)).status, 200);
  }
  // Approved but owner-hidden files still remain private even after approval.
  db.prepare("UPDATE profile_media SET moderation_status='approved' WHERE profile_id=?").run(fixtures.profileId);
  assert.equal((await get(`/media/${fixtures.previewMediaIds[0]}`)).status, 404);
  db.prepare("UPDATE profiles SET status='pending', owner_hidden_at=NULL WHERE id=?").run(fixtures.profileId);
  db.prepare("UPDATE profile_media SET moderation_status='pending' WHERE profile_id=?").run(fixtures.profileId);
  const home = await (await get('/mi-cuenta', fixtures.ownerCookie)).text();
  assert.ok(home.includes('Previsualizar anuncio'));
  const edit = await (await get(`/mi-cuenta/${fixtures.profileId}/editar`, fixtures.ownerCookie)).text();
  assert.ok(edit.includes('Previsualizar anuncio') && edit.includes('Características opcionales'));
  assert.ok(!edit.includes('name="artist_name"'));
  // Save real drafts with nothing supplemental filled in. The collapsed
  // selects still supply defaults; blank optional fields must never block.
  db.prepare("UPDATE profiles SET type='agency' WHERE id=?").run(fixtures.profileId);
  fixtures.coreDraftIds = [];
  writeFileSync(manifest, JSON.stringify(fixtures));
  for (const type of ['escort', 'agency', 'rental']) {
    const body = new FormData();
    for (const [key, value] of Object.entries({ type, tier: 'bronze', display_name: `${fixtures.prefix} ${type}`, region: 'Región del Biobío', city: 'Concepción', short_description: 'Prueba local mínima', description: 'Borrador temporal de QA. No publicar.', contact_whatsapp: '56912345678', intent: 'draft' })) body.set(key, value);
    const created = await fetch(base + '/api/perfiles/nuevo', { method: 'POST', headers: { cookie: fixtures.ownerCookie, origin: base }, body, redirect: 'manual' });
    assert.equal(created.status, 303);
    const destination = new URL(created.headers.get('location'), base);
    assert.equal(destination.searchParams.get('notice'), 'saved');
    const id = destination.pathname.split('/')[2];
    fixtures.coreDraftIds.push(id); writeFileSync(manifest, JSON.stringify(fixtures));
    const record = db.prepare('SELECT owner_id,type,status,handle FROM profiles WHERE id=?').get(id);
    assert.equal(record.owner_id, fixtures.owner); assert.equal(record.type, type); assert.equal(record.status, 'draft'); assert.ok(record.handle);
  }
  removeCoreDrafts();
  db.prepare("UPDATE profiles SET type='escort' WHERE id=?").run(fixtures.profileId);
  console.log('PASS: 3 listing types × 5 unpublished states: owner/admin allowed, anonymous/other account denied. Pending media, hidden approved media, noindex and preview links verified.');
  console.log('PASS: real drafts saved for all 3 types with only essential fields; automatic handle and defaults preserved.');
}
} finally { db.close(); }
