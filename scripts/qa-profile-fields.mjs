// Local-only form/API/SSR checks using disposable qa-media-admin fixtures.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const base = 'http://localhost:3000';
const fixtures = JSON.parse(readFileSync('outputs/qa-media-admin.json', 'utf8'));
assert.ok(fixtures.prefix.startsWith('qa_media_'));
const database = resolve('.wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite');
assert.ok(database.startsWith(resolve('.wrangler/visual-state') + '\\'));
const db = new DatabaseSync(database);
db.exec('PRAGMA foreign_keys=ON');
assert.equal(db.prepare('SELECT owner_id FROM profiles WHERE id=?').get(fixtures.profileId).owner_id, fixtures.owner);
const createdIds = [];
// Direct SQL fixture changes do not invalidate already cached public HTML.
// An invalid Authorization header bypasses edge cache without authenticating
// the request, so these checks exercise fresh anonymous visibility/SEO.
const get = (path, cookie) => fetch(base + path, { headers: { authorization: 'qa-local-cache-bypass', ...(cookie ? { cookie } : {}) }, redirect: 'manual' });
const post = (path, cookie, values) => {
  const body = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) body.append(key, item);
  }
  return fetch(base + path, { method: 'POST', headers: { cookie, origin: base }, body, redirect: 'manual' });
};
const essential = { tier: 'bronze', display_name: fixtures.prefix, region: 'Región del Biobío', city: 'Concepción', short_description: 'Prueba local del formulario', description: 'Prueba aislada y temporal. No es un anuncio real.', contact_whatsapp: '56912345678' };
const optional = { handle: fixtures.prefix, comuna: 'Centro', reference_location: 'Cerca del centro, sin dirección exacta', nationality: 'Chilena', languages: ['Español', 'Inglés'], height_cm: '165', price_60_min: '50000', tags: ['masajes', 'hombres'], services_included: ['Videollamada'] };
try {
  // Remove the one-Escort restriction only in this disposable fixture by
  // temporarily making its listing an agency (never change a real account).
  db.prepare("UPDATE profiles SET type='agency' WHERE id=?").run(fixtures.profileId);
  for (const admin of [false, true]) {
    const cookie = admin ? fixtures.adminCookie : fixtures.ownerCookie;
    const endpoint = admin ? `/api/admin/cuentas/${fixtures.owner}/perfiles` : '/api/perfiles/nuevo';
    for (const data of [{}, { gender: 'Femenino' }, { gender: 'Inventado', age: '28' }, { gender: 'Femenino', age: '17' }, { gender: 'Femenino', age: '100' }]) {
      const invalid = await post(endpoint, cookie, { ...essential, type: 'escort', intent: 'submit', ...data });
      assert.equal(invalid.status, 303);
      assert.equal(new URL(invalid.headers.get('location'), base).searchParams.get('error'), 'validation');
    }
    for (const type of ['escort', 'agency', 'rental']) {
      const response = await post(endpoint, cookie, { ...essential, type, intent: 'submit', ...(type === 'escort' ? { gender: 'Femenino', age: '28' } : {}) });
      assert.equal(response.status, 303);
      const destination = new URL(response.headers.get('location'), base);
      assert.equal(destination.searchParams.get('error'), null);
      const id = admin ? destination.pathname.split('/')[5] : destination.pathname.split('/')[2];
      createdIds.push(id);
      const row = db.prepare('SELECT owner_id,type,status,display_name,handle FROM profiles WHERE id=?').get(id);
      assert.equal(row.owner_id, fixtures.owner); assert.equal(row.type, type); assert.equal(row.status, 'pending'); assert.ok(row.handle);
      const details = JSON.parse(db.prepare('SELECT metadata FROM profile_details WHERE profile_id=?').get(id).metadata);
      assert.equal(details.age, type === 'escort' ? '28' : undefined);
      // Leave no extra Escort active before the next endpoint is tested.
      db.prepare('DELETE FROM admin_notifications WHERE profile_id=? AND actor_user_id=?').run(id, fixtures.owner);
      db.prepare('DELETE FROM profiles WHERE id=? AND owner_id=?').run(id, fixtures.owner);
    }
  }
  // Drafts still save before choosing the two newly mandatory publish fields.
  const draft = await post('/api/perfiles/nuevo', fixtures.ownerCookie, { ...essential, type: 'escort', intent: 'draft' });
  const destination = new URL(draft.headers.get('location'), base);
  assert.equal(destination.searchParams.get('notice'), 'saved');
  createdIds.push(destination.pathname.split('/')[2]);
  const id = createdIds.at(-1);
  assert.equal(db.prepare('SELECT status FROM profiles WHERE id=?').get(id).status, 'draft');
  db.prepare('DELETE FROM admin_notifications WHERE profile_id=? AND actor_user_id=?').run(id, fixtures.owner);
  db.prepare('DELETE FROM profiles WHERE id=? AND owner_id=?').run(id, fixtures.owner);

  for (const type of ['escort', 'agency', 'rental']) {
    db.prepare("UPDATE profiles SET type=?, status='draft', owner_hidden_at=NULL WHERE id=?").run(type, fixtures.profileId);
    for (const populated of [false, true]) {
      const values = { ...essential, type, intent: 'submit', ...(type === 'escort' ? { gender: 'Femenino', age: '28' } : {}), ...(populated ? optional : {}) };
      const saved = await post(`/api/perfiles/${fixtures.profileId}`, fixtures.ownerCookie, values);
      assert.equal(new URL(saved.headers.get('location'), base).searchParams.get('notice'), 'submitted');
      db.prepare("UPDATE profiles SET status='approved' WHERE id=?").run(fixtures.profileId);
      const handle = db.prepare('SELECT handle FROM profiles WHERE id=?').get(fixtures.profileId).handle;
      const path = `/perfil/@${handle}`;
      const response = await get(path), html = await response.text();
      assert.equal(response.status, 200, JSON.stringify({ type, populated, row: db.prepare('SELECT handle,status,type,owner_hidden_at,trashed_at FROM profiles WHERE id=?').get(fixtures.profileId) }));
      assert.match(html, /rel="canonical" href="[^"]*\/perfil\/@qa[-_]media[-_]/);
      assert.match(html, /name="description" content="[^"]*(escort|arriendo)/);
      assert.match(html, /"@type":"(Person|Organization|Accommodation)"/);
      assert.doesNotMatch(html, /name="robots" content="[^"]*noindex/);
      if (type === 'escort') {
        assert.ok(html.includes('28 años'));
        assert.equal(html.includes('165 cm'), populated);
      } else {
        assert.ok(!html.includes('28 años') && !html.includes('165 cm'));
      }
      assert.equal(html.includes('Cerca del centro, sin dirección exacta'), populated);
      // Pending listings must immediately disappear from anonymous indexing.
      db.prepare("UPDATE profiles SET status='pending' WHERE id=?").run(fixtures.profileId);
      const privateHtml = await (await get(path, fixtures.ownerCookie)).text();
      assert.match(privateHtml, /name="robots" content="[^"]*noindex/);
      assert.equal((await get(path)).status, 404);
    }
  }
  console.log('PASS: normal/admin submissions require Escort age/gender; agencies/rentals and incomplete drafts work.');
  console.log('PASS: 3 types × blank/populated optionals render correct public SEO, canonical and facts; pending previews remain private/noindex.');
} finally {
  for (const id of createdIds) {
    const row = db.prepare('SELECT owner_id,display_name FROM profiles WHERE id=?').get(id);
    if (!row) continue;
    assert.equal(row.owner_id, fixtures.owner); assert.equal(row.display_name, fixtures.prefix);
    db.prepare('DELETE FROM admin_notifications WHERE profile_id=? AND actor_user_id=?').run(id, fixtures.owner);
    db.prepare('DELETE FROM profiles WHERE id=? AND owner_id=?').run(id, fixtures.owner);
  }
  db.prepare('DELETE FROM admin_notifications WHERE profile_id=? AND actor_user_id=?').run(fixtures.profileId, fixtures.owner);
  db.prepare("UPDATE profiles SET type='escort', status='draft' WHERE id=?").run(fixtures.profileId);
  db.close();
}
