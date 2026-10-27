import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
import { isAdministrativeBrowser } from '../lib/browser-measurement.ts';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
test('the real contact endpoints exclude administrative traffic while retaining anonymous and account click statistics', async t => {
  const sqlite = new DatabaseSync(':memory:');
  let databaseReads = 0;
  const prepare = (query, args = []) => ({ bind: (...values) => prepare(query, values), async all() { const statement = sqlite.prepare(query); return statement.columns().length ? { results: statement.all(...args) } : { results: [], meta: statement.run(...args) }; }, async run() { return this.all(); }, async raw() { const statement = sqlite.prepare(query); statement.setReturnArrays(true); return statement.all(...args); } });
  globalThis.__contactTrafficDb = drizzle({ prepare });
  globalThis.__contactTrafficAdmin = null; globalThis.__contactTrafficUser = null;
  globalThis.__contactTrafficGetDb = async () => { databaseReads++; return globalThis.__contactTrafficDb; };
  const hooks = registerHooks({ resolve(specifier, context, next) {
    const stubs = {
      '@/db': 'export const getDb=async()=>globalThis.__contactTrafficGetDb();',
      '@/lib/auth': 'export const getCurrentAdmin=async()=>globalThis.__contactTrafficAdmin;export const getCurrentUser=async()=>globalThis.__contactTrafficUser;export const createOpaqueToken=()=>"qa_viewer_"+crypto.randomUUID().replaceAll("-","");export function assertSameOrigin(request){if(request.headers.get("origin")!==new URL(request.url).origin)throw new Error("Invalid origin");}',
      '@/lib/site-settings': 'export const getSiteSettings=async()=>({contact_whatsapp:"56911112222",contact_whatsapp_label:"Soporte QA",contact_whatsapp_description:"Soporte local",contact_whatsapp_message:"Hola",whatsapp_extra_contacts:"[]",whatsapp_panel_enabled:"enabled"});',
    };
    if (stubs[specifier]) return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    if (specifier === 'next/server') return next('next/server.js', context);
    if (specifier.startsWith('@/')) return { url: new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, shortCircuit: true };
    if (specifier.startsWith('./') && context.parentURL?.startsWith(new URL('../lib/', import.meta.url).href) && !/\.[a-z]+$/i.test(specifier)) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    return next(specifier, context);
  } });
  try {
    sqlite.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,is_active INTEGER);CREATE TABLE profiles(id TEXT PRIMARY KEY,owner_id TEXT,status TEXT,owner_hidden_at TEXT,trashed_at TEXT);INSERT INTO users VALUES('owner',1),('normal-account',1),('disabled-owner',0);INSERT INTO profiles VALUES('public-profile','owner','approved',NULL,NULL),('private-profile','owner','draft',NULL,NULL),('disabled-profile','disabled-owner','approved',NULL,NULL);");
    const initial = await source('drizzle/0011_puzzling_deathbird.sql');
    sqlite.exec(initial.match(/CREATE TABLE `profile_contact_events` \([\s\S]+?\);/)[0]);
    for (const statement of initial.matchAll(/CREATE (?:UNIQUE )?INDEX `profile_contact_events?[^;]+;/g)) sqlite.exec(statement[0]);
    const enrichment = await source('drizzle/0032_black_kulan_gath.sql');
    for (const statement of enrichment.matchAll(/ALTER TABLE `profile_contact_events`[^;]+;/g)) sqlite.exec(statement[0]);
    sqlite.exec('ALTER TABLE profile_contact_events ADD COLUMN click_count INTEGER NOT NULL DEFAULT 1');
    sqlite.exec(await source('drizzle/0040_portal_whatsapp.sql'));
    const { NextRequest } = await import('next/server.js');
    const profileRoute = await import('../app/api/perfiles/[profileId]/contacto/route.ts');
    const portalRoute = await import('../app/api/contacto/whatsapp/route.ts');
    const { getAdminWhatsappStatistics } = await import('../lib/profile-contact-statistics.ts');
    const viewer = 'viewer_123456789012345678901234567890123456';
    const accountCookie = `chile3x_user_session=normal-account.secret; chile3x_profile_viewer=${viewer}`;
    const profileClick = (cookie = '', { profileId = 'public-profile', kind = 'whatsapp', origin = 'https://contact.invalid' } = {}) => profileRoute.POST(new NextRequest('https://contact.invalid/api/perfiles/' + profileId + '/contacto', { method: 'POST', headers: { origin, cookie, 'content-type': 'application/json', 'user-agent': 'QA Computador', referer: 'https://contact.invalid/perfil/public-profile' }, body: JSON.stringify({ kind }) }), { params: Promise.resolve({ profileId }) });
    const portalClick = (cookie = '', { action = 'contact_click', contactId = 'support', placement = 'header', origin = 'https://contact.invalid' } = {}) => portalRoute.POST(new NextRequest('https://contact.invalid/api/contacto/whatsapp', { method: 'POST', headers: { origin, cookie, 'content-type': 'application/json' }, body: JSON.stringify({ action, contactId, placement }) }));
    const count = table => Number(sqlite.prepare('SELECT count(*) n FROM ' + table).get().n);

    await t.test('a signed-in administrator never writes advertiser clicks or portal counter rows and receives no viewer cookie', async () => {
      globalThis.__contactTrafficAdmin = { id: 'local-admin' };
      const before = databaseReads;
      for (const cookie of ['chile3x_admin_session=admin.secret', '']) {
        const profile = await profileClick(cookie), portal = await portalClick(cookie);
        assert.equal(profile.status, 204); assert.equal(portal.status, 204); assert.equal(profile.headers.get('set-cookie'), null);
      }
      assert.equal(databaseReads, before); assert.equal(count('profile_contact_events'), 0); assert.equal(count('portal_whatsapp_events'), 0);
      assert.equal((await profileClick('chile3x_admin_session=admin.secret', { origin: 'https://other.invalid' })).status, 403);
      globalThis.__contactTrafficAdmin = null;
    });

    await t.test('old admin cookies and mixed or duplicated session cookies cannot silently become anonymous traffic', async () => {
      const before = databaseReads;
      for (const cookie of [
        'chile3x_admin_session=expired-admin.secret',
        'chile3x_admin_session=admin.secret; chile3x_user_session=account.secret',
        'chile3x_user_session=one.secret; chile3x_user_session=two.secret',
      ]) { assert.equal((await profileClick(cookie)).status, 204); assert.equal((await portalClick(cookie)).status, 204); }
      assert.equal(databaseReads, before); assert.equal(count('profile_contact_events'), 0); assert.equal(count('portal_whatsapp_events'), 0);
    });

    await t.test('an anonymous visitor counts normally, with daily deduplication and cumulative taps preserved', async () => {
      const first = await profileClick(); assert.equal(first.status, 204); assert.match(first.headers.get('set-cookie'), /chile3x_profile_viewer=/);
      for (let i = 0; i < 2; i++) assert.equal((await profileClick(`chile3x_profile_viewer=${viewer}`)).status, 204);
      const row = sqlite.prepare('SELECT * FROM profile_contact_events WHERE viewer_key=?').get(viewer);
      assert.equal(row.click_count, 2); assert.equal(row.viewer_user_id, null); assert.equal(row.device_type, 'unknown'); assert.equal(row.referrer_path, null);
      assert.equal((await portalClick()).status, 204); assert.equal((await portalClick()).status, 204);
      assert.equal(sqlite.prepare("SELECT hits FROM portal_whatsapp_events WHERE action='contact_click'").get().hits, 2);
      assert.equal((await portalClick('', { action: 'panel_open', contactId: 'panel', placement: 'floating' })).status, 204);
      assert.equal(count('portal_whatsapp_events'), 2);
    });

    await t.test('a normal account remains measurable and personal attribution still requires analytics consent', async () => {
      globalThis.__contactTrafficUser = { id: 'normal-account' };
      assert.equal((await profileClick(accountCookie)).status, 204);
      assert.equal(sqlite.prepare('SELECT viewer_user_id FROM profile_contact_events WHERE viewer_key=?').get(viewer).viewer_user_id, null);
      assert.equal((await profileClick(accountCookie + '; chile3x_admin_session=')).status, 204);
      assert.equal((await profileClick(accountCookie + '; chile3x_analytics_consent=granted')).status, 204);
      const row = sqlite.prepare('SELECT * FROM profile_contact_events WHERE viewer_key=?').get(viewer);
      assert.equal(row.click_count, 5); assert.equal(row.viewer_user_id, 'normal-account'); assert.equal(row.device_type, 'desktop'); assert.equal(row.referrer_path, '/perfil/public-profile');
      assert.equal((await portalClick(accountCookie)).status, 204);
      assert.equal(sqlite.prepare("SELECT hits FROM portal_whatsapp_events WHERE action='contact_click'").get().hits, 3);
      assert.equal(await getAdminWhatsappStatistics('public-profile'), null);
      globalThis.__contactTrafficAdmin = { id: 'local-admin' };
      const before = await getAdminWhatsappStatistics('public-profile');
      await profileClick('chile3x_admin_session=admin.secret');
      assert.deepEqual(await getAdminWhatsappStatistics('public-profile'), before);
      assert.deepEqual(before, { clicks: 6, dailyBrowsers: 2 });
      globalThis.__contactTrafficAdmin = null; globalThis.__contactTrafficUser = null;
    });

    await t.test('private samples, unpublished listings, disabled owners and invalid requests remain uncounted', async () => {
      const before = count('profile_contact_events');
      for (const profileId of ['private-profile', 'disabled-profile', 'sam_private-sample', 'missing']) assert.equal((await profileClick('', { profileId })).status, 204);
      assert.equal(count('profile_contact_events'), before);
      assert.equal((await profileClick('', { kind: 'fake' })).status, 400);
      assert.equal((await profileClick('', { origin: 'https://other.invalid' })).status, 403);
      assert.equal((await portalClick('', { placement: 'invalid' })).status, 400);
      assert.equal((await portalClick('', { origin: 'https://other.invalid' })).status, 403);
    });
  } finally { hooks.deregister(); sqlite.close(); delete globalThis.__contactTrafficDb; delete globalThis.__contactTrafficAdmin; delete globalThis.__contactTrafficUser; delete globalThis.__contactTrafficGetDb; }
});

test('the browser exclusion marker is display-only and shared contact controls retain their normal navigation', async () => {
  const previous = globalThis.document;
  try {
    delete globalThis.document; assert.equal(isAdministrativeBrowser(), false);
    globalThis.document = { querySelector: selector => selector.includes('data-session-mode="admin"') ? {} : null };
    assert.equal(isAdministrativeBrowser(), true);
    globalThis.document = { querySelector: () => null }; assert.equal(isAdministrativeBrowser(), false);
  } finally { globalThis.document = previous; }
  const [boundary, analytics, tracked, portal] = await Promise.all(['app/BrowserSessionBoundary.tsx', 'app/AnalyticsEvent.tsx', 'app/perfil/TrackedContactLink.tsx', 'app/PortalWhatsappLink.tsx'].map(source));
  assert.match(boundary, /data-session-mode=\{mode \?\? "anonymous"\}/);
  assert.match(analytics, /isAdministrativeBrowser\(\) \|\| !hasAnalyticsConsent\(\)/);
  for (const text of [tracked, portal]) assert.match(text, /if \(isAdministrativeBrowser\(\)\) return;/);
  assert.match(tracked, /if \(!event.defaultPrevented\) track\(\)/);
  assert.match(portal, /href|ComponentProps<"a">/);
});
