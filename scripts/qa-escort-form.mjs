// Uses only loopback and disposable local D1 rows. The active theme is untouched.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const upstream = 'http://127.0.0.1:3880';
const fixtures = JSON.parse(readFileSync('outputs/qa-account-stories.json', 'utf8'));
assert.match(fixtures.prefix, /^qa_stories_[a-f0-9]+$/);
const stateRoot = resolve('.wrangler/visual-state');
const database = resolve(stateRoot, 'v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(database.startsWith(stateRoot + '\\') || database.startsWith(stateRoot + '/'));
const db = new DatabaseSync(database);
db.exec('PRAGMA foreign_keys=ON');
const ownerId = fixtures.prefix + '_form_' + randomBytes(4).toString('hex');
const secret = randomBytes(24).toString('base64url');
const browser = randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(value).digest('hex');
const cookie = `chile3x_user_session=${ownerId}_session.${secret}; __Host-chile3x_browser=${browser}`;
const request = (path, activeCookie = cookie, options = {}) => fetch(upstream + path, {
  ...options, redirect: 'manual', signal: AbortSignal.timeout(30000),
  headers: { cookie: activeCookie, origin: upstream, authorization: 'qa-loopback', ...options.headers },
});
const makeBody = values => {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) body.append(key, item);
  }
  return body;
};
const core = {
  type: 'escort', tier: 'vip', display_name: ownerId, region: 'Región del Biobío', city: 'Concepción',
  gender: 'Masculino', age: '28', short_description: 'Formulario temporal QA local',
  description: 'Datos descartables para comprobar el formulario. No es un anuncio real.',
  contact_whatsapp: '56911111111', contact_telegram: 'https://t.me/qa_formulario',
  contact_email: 'qa@example.invalid', instagram_url: 'qa_formulario',
  arsmate_url: 'qa_formulario', onlyfans_url: 'qa_formulario',
  languages: ['Español', 'Inglés'], tags: ['masajes'], intent: 'submit',
  availability_mon_enabled: 'on', availability_mon_opens: '09:00', availability_mon_closes: '18:00',
  availability_wed_enabled: 'on', availability_wed_opens: '00:00', availability_wed_closes: '24:00',
};
const snapshot = id => ({
  profile: db.prepare('SELECT * FROM profiles WHERE id=?').get(id),
  details: db.prepare('SELECT * FROM profile_details WHERE profile_id=?').get(id),
  tags: db.prepare('SELECT tag FROM profile_tags WHERE profile_id=? ORDER BY tag').all(id).map(row => row.tag),
});
const removeProfile = id => {
  const row = db.prepare('SELECT owner_id FROM profiles WHERE id=?').get(id);
  if (!row) return;
  assert.equal(row.owner_id, ownerId);
  db.prepare('DELETE FROM admin_notifications WHERE profile_id=?').run(id);
  db.prepare('DELETE FROM admin_audit_logs WHERE entity_type=? AND entity_id=?').run('profile', id);
  db.prepare('DELETE FROM profiles WHERE id=? AND owner_id=?').run(id, ownerId);
};
const edit = (id, values, activeCookie = cookie, revision) => request(`/api/perfiles/${id}`, activeCookie, {
  method: 'POST', body: makeBody({ ...values, review_key: `profile:${id}`, review_revision: String(revision ?? snapshot(id).profile.revision) }),
});
const location = response => new URL(response.headers.get('location'), upstream);
const assertSaved = response => {
  assert.equal(response.status, 303);
  assert.equal(location(response).searchParams.get('error'), null, location(response).searchParams.get('message') ?? 'Server rejected submission');
};

try {
  db.prepare('INSERT INTO users(id,email,username,display_name,role,is_active,email_verified_at,city) VALUES(?,?,?,?,?,1,?,?)')
    .run(ownerId, ownerId + '@example.invalid', ownerId, 'Formulario QA local', 'advertiser', new Date().toISOString(), 'Concepción');
  db.prepare('INSERT INTO auth_sessions(id,user_id,token_hash,browser_key_hash,auth_method,expires_at) VALUES(?,?,?,?,?,?)')
    .run(ownerId + '_session', ownerId, hash(secret), hash(browser), 'password', new Date(Date.now() + 3600000).toISOString());

  for (const [endpoint, activeCookie] of [
    ['/api/perfiles/nuevo', cookie],
    [`/api/admin/cuentas/${ownerId}/perfiles`, fixtures.cookies.admin],
  ]) {
    const created = await request(endpoint, activeCookie, { method: 'POST', body: makeBody(core) });
    assertSaved(created);
    const id = db.prepare('SELECT id FROM profiles WHERE owner_id=?').get(ownerId)?.id;
    assert.ok(id, 'The local submission must create its listing');
    let saved = snapshot(id);
    assert.deepEqual(saved.tags, ['hombres', 'masajes']);
    let metadata = JSON.parse(saved.details.metadata);
    assert.equal(metadata.availability, 'mon=09:00-18:00|wed=00:00-24:00');
    assert.equal(metadata.languages, 'Español, Inglés');
    assert.equal(metadata.instagram_url, 'https://www.instagram.com/qa_formulario');
    assert.equal(saved.profile.contact_telegram, 'qa_formulario');

    const editor = await request(`/mi-cuenta/${id}/editar`);
    assert.equal(editor.status, 200);
    const html = await editor.text();
    assert.match(html, /name="robots" content="[^"]*noindex/);
    // Browser QA verifies the disclosure and absence of the old checkbox
    // after BrowserSessionSetup hydrates this protected page.

    const feminine = { ...core, gender: 'Femenino', tags: ['hombres', 'masajes'] };
    assertSaved(await edit(id, feminine));
    assert.deepEqual(snapshot(id).tags, ['masajes'], 'A stale or forged Hombres checkbox must be removed for other genders');

    const unchanged = snapshot(id);
    for (const invalid of [
      { ...core, tags: ['milf'] },
      { ...core, availability_mon_closes: '08:00' },
      { ...core, availability_mon_closes: '' },
    ]) {
      const rejected = await edit(id, invalid);
      assert.equal(rejected.status, 303);
      assert.equal(location(rejected).searchParams.get('error'), 'validation');
      assert.deepEqual(snapshot(id), unchanged, 'Invalid tags or time ranges must never partially update a listing');
    }
    const forbiddenOrigin = await request(`/api/perfiles/${id}`, cookie, {
      method: 'POST', headers: { origin: 'https://other.invalid' }, body: makeBody(feminine),
    });
    assert.equal(forbiddenOrigin.status, 403);
    assert.equal((await edit(id, feminine, cookie, Math.max(0, unchanged.profile.revision - 1))).status, 409);
    assert.deepEqual(snapshot(id), unchanged, 'Origin and stale-version rejections must preserve the listing');

    db.prepare("UPDATE profiles SET status='approved' WHERE id=? AND owner_id=?").run(id, ownerId);
    const contactChange = { ...feminine, contact_whatsapp: '56922222222', contact_email: 'nuevo@example.invalid', contact_telegram: '@qa_nuevo', instagram_url: 'qa_nuevo', arsmate_url: 'qa_nuevo', onlyfans_url: 'qa_nuevo' };
    const contacts = await edit(id, contactChange);
    assertSaved(contacts);
    assert.equal(location(contacts).searchParams.get('notice'), 'contacts_saved');
    saved = snapshot(id);
    assert.equal(saved.profile.status, 'approved');
    assert.equal(saved.profile.contact_whatsapp, '56922222222');
    metadata = JSON.parse(saved.details.metadata);
    assert.equal(metadata.arsmate_url, 'https://arsmate.com/qa_nuevo');
    assert.equal(metadata.onlyfans_url, 'https://onlyfans.com/qa_nuevo');

    const adminEdit = await request(`/api/admin/profiles/${id}/editar`, fixtures.cookies.admin, {
      method: 'POST', body: makeBody({ ...core, review_key: `profile:${id}`, review_revision: String(saved.profile.revision) }),
    });
    assertSaved(adminEdit);
    assert.deepEqual(snapshot(id).tags, ['hombres', 'masajes']);
    assert.equal(snapshot(id).profile.status, 'approved', 'Administrative edits preserve the current moderation state');
    removeProfile(id);
    console.log('PASS ' + (endpoint.startsWith('/api/admin') ? 'admin' : 'owner') + ': create/edit, automatic Hombres, restored/forged tags, language/schedule/contact serialization, validation, origin, revisions and approval');
  }
} finally {
  for (const { id } of db.prepare('SELECT id FROM profiles WHERE owner_id=?').all(ownerId)) removeProfile(id);
  db.prepare('DELETE FROM admin_notifications WHERE actor_user_id=?').run(ownerId);
  db.prepare('DELETE FROM admin_audit_logs WHERE entity_type=? AND entity_id=?').run('account', ownerId);
  db.prepare('DELETE FROM users WHERE id=?').run(ownerId);
  db.close();
}
