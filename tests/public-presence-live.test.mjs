import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';

test('presence reads batch public profile booleans, respect disabled owners and expire without renewing activity', async t => {
  const now = new Date('2026-10-26T12:00:00.000Z');
  t.mock.timers.enable({ apis: ['Date'], now });
  const sqlite = new DatabaseSync(':memory:');
  const prepare = (query, args = []) => ({ bind: (...values) => prepare(query, values), async all() { const statement = sqlite.prepare(query); return statement.columns().length ? { results: statement.all(...args) } : { results: [], meta: statement.run(...args) }; }, async run() { return this.all(); }, async raw() { const statement = sqlite.prepare(query); statement.setReturnArrays(true); return statement.all(...args); } });
  globalThis.__livePresenceDb = drizzle({ prepare });
  globalThis.__livePresenceUser = null;
  const hooks = registerHooks({ resolve(specifier, context, next) {
    const stubs = {
      '@/db': 'export const getDb=async()=>globalThis.__livePresenceDb;',
      '@/lib/auth': 'export const getCurrentUser=async()=>globalThis.__livePresenceUser;export function assertSameOrigin(request){if(request.headers.get("origin")!==new URL(request.url).origin)throw new Error("Invalid origin");}',
    };
    if (stubs[specifier]) return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, shortCircuit: true };
    if (specifier.startsWith('./') && !/\.[a-z]+$/i.test(specifier)) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    return next(specifier, context);
  } });
  try {
    sqlite.exec('CREATE TABLE users(id TEXT PRIMARY KEY,is_active INTEGER,self_disabled_at TEXT,admin_disabled_at TEXT); CREATE TABLE profiles(id TEXT PRIMARY KEY,owner_id TEXT,status TEXT,owner_hidden_at TEXT,trashed_at TEXT,is_demo INTEGER); CREATE TABLE account_presence(user_id TEXT PRIMARY KEY,last_active_at TEXT,updated_at TEXT);');
    for (const [id, active, self, admin] of [['owner', 1, null, null], ['disabled', 0, null, null], ['self-disabled', 1, 'disabled', null], ['admin-disabled', 1, null, 'disabled']]) sqlite.prepare('INSERT INTO users VALUES(?,?,?,?)').run(id, active, self, admin);
    for (const [id, owner, status, hidden, trashed, demo] of [
      ['prf_current', 'owner', 'approved', null, null, 0], ['prf_second', 'owner', 'approved', null, null, 0],
      ['prf_paused', 'owner', 'paused', null, null, 0], ['prf_hidden', 'owner', 'approved', 'hidden', null, 0], ['prf_trash', 'owner', 'approved', null, 'trash', 0], ['prf_demo', 'owner', 'approved', null, null, 1],
      ['prf_disabled', 'disabled', 'approved', null, null, 0], ['prf_self_disabled', 'self-disabled', 'approved', null, null, 0], ['prf_admin_disabled', 'admin-disabled', 'approved', null, null, 0],
    ]) sqlite.prepare('INSERT INTO profiles VALUES(?,?,?,?,?,?)').run(id, owner, status, hidden, trashed, demo);
    const { GET, POST } = await import('../app/api/presencia/route.ts');
    const { presenceProfileIds } = await import('../lib/public-presence.ts');
    const get = ids => GET(new Request('https://presence.invalid/api/presencia?' + new URLSearchParams(ids.map(id => ['id', id]))));
    const post = origin => POST(new Request('https://presence.invalid/api/presencia', { method: 'POST', headers: { origin: origin ?? 'https://presence.invalid' } }));
    assert.equal((await post()).status, 401);
    globalThis.__livePresenceUser = { id: 'owner' };
    assert.equal((await post('https://other.invalid')).status, 403);
    assert.equal((await post()).status, 204);
    for (const owner of ['disabled', 'self-disabled', 'admin-disabled']) sqlite.prepare('INSERT INTO account_presence VALUES(?,?,?)').run(owner, now.toISOString(), now.toISOString());
    globalThis.__livePresenceUser = null;
    const all = sqlite.prepare('SELECT id FROM profiles').all().map(row => row.id);
    let response = await get([...all, 'sam_private_sample', 'nonexistent']);
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual((await response.json()).onlineProfileIds.sort(), ['prf_current', 'prf_second']);
    assert.equal(sqlite.prepare("SELECT last_active_at FROM account_presence WHERE user_id='owner'").get().last_active_at, now.toISOString());
    t.mock.timers.setTime(now.getTime() + 180_000);
    assert.deepEqual((await (await get(['prf_current'])).json()).onlineProfileIds, ['prf_current']);
    t.mock.timers.setTime(now.getTime() + 180_001);
    assert.deepEqual((await (await get(['prf_current'])).json()).onlineProfileIds, []);
    assert.equal((await get(Array.from({ length: 61 }, (_, i) => 'prf_' + i))).status, 400);
    assert.equal((await get(["bad' OR 1=1--"])).status, 400);
    assert.deepEqual(presenceProfileIds(['prf_current', 'prf_current']), ['prf_current']);
    assert.deepEqual((await (await get([])).json()), { onlineProfileIds: [] });
  } finally { hooks.deregister(); sqlite.close(); delete globalThis.__livePresenceDb; delete globalThis.__livePresenceUser; }
});

test('visible profile badges share bounded batches, pause in hidden tabs and release their polling timer', async () => {
  const originalWindow = globalThis.window, originalDocument = globalThis.document, originalFetch = globalThis.fetch;
  const document = new EventTarget(); document.visibilityState = 'visible';
  globalThis.window = {}; globalThis.document = document;
  const subscriptions = [], calls = [], values = new Map();
  const settle = async condition => { for (let attempt = 0; attempt < 50 && !condition(); attempt++) await new Promise(resolve => setTimeout(resolve, 5)); assert.ok(condition(), 'client presence check completed'); };
  try {
    globalThis.fetch = async (url, options) => {
      const ids = new URL(url, 'https://presence.invalid').searchParams.getAll('id'); calls.push({ ids, options });
      return Response.json({ onlineProfileIds: ids.filter(id => id.endsWith('0')) });
    };
    const { subscribePublicPresence } = await import('../app/public-presence-client.ts');
    for (let index = 0; index < 70; index++) {
      const id = 'prf_live' + index;
      subscriptions.push(subscribePublicPresence(id, online => values.set(id, online)));
    }
    let duplicate;
    subscriptions.push(subscribePublicPresence('prf_live0', online => { duplicate = online; }));
    await settle(() => values.size === 70);
    assert.deepEqual(calls.map(call => call.ids.length), [60, 10]);
    assert.equal(duplicate, true); assert.equal(values.get('prf_live1'), false);
    assert.ok(calls.every(call => call.options.cache === 'no-store' && call.options.credentials === 'omit'));
    document.visibilityState = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
    subscriptions.push(subscribePublicPresence('prf_hidden_new', online => values.set('prf_hidden_new', online)));
    await new Promise(resolve => setTimeout(resolve, 20)); assert.equal(calls.length, 2);
    document.visibilityState = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
    await settle(() => values.has('prf_hidden_new'));
    assert.equal(calls.length, 4); assert.ok(calls.every(call => call.ids.length <= 60));
    subscriptions.splice(0).forEach(unsubscribe => unsubscribe());
    globalThis.fetch = async () => { throw new Error('offline'); };
    let failed;
    subscriptions.push(subscribePublicPresence('prf_failure', online => { failed = online; }));
    await settle(() => failed === false);
  } finally {
    subscriptions.forEach(unsubscribe => unsubscribe());
    globalThis.window = originalWindow; globalThis.document = originalDocument; globalThis.fetch = originalFetch;
  }
});

test('real public cards and profiles use the shared live badge while private samples never subscribe', async () => {
  const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
  const [cards, page, sample, heartbeat] = await Promise.all(['app/directorio/_components.tsx', 'app/perfil/[slug]/page.tsx', 'lib/private-samples.ts', 'app/PresenceHeartbeat.tsx'].map(source));
  assert.match(cards, /profile\.isPublic && !profile\.isDemo && <ProfileOnlineBadge/);
  assert.match(page, /!sample && profile\.isPublic && !profile\.isDemo && <ProfileOnlineBadge/);
  assert.match(sample, /isOnline: false/);
  assert.match(heartbeat, /fetch\("\/api\/presencia"[^\n]+\.catch\(/);
});
