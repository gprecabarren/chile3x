import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('sample action API preserves invitation state and coordinates private administrative mutations', async t => {
  const sqlite = new DatabaseSync(':memory:');
  const prepare = (query, args = []) => ({
    bind: (...values) => prepare(query, values),
    execute() {
      const statement = sqlite.prepare(query);
      if (statement.columns().length) return { results: statement.all(...args) };
      const result = statement.run(...args);
      return { results: [], meta: { changes: Number(result.changes) } };
    },
    async all() { return this.execute(); }, async run() { return this.execute(); },
    async raw() { const statement = sqlite.prepare(query); statement.setReturnArrays(true); return statement.all(...args); },
  });
  const binding = { prepare, async batch(statements) {
    sqlite.exec('BEGIN');
    try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
  globalThis.__sampleActionsDb = drizzle(binding);
  const hooks = registerHooks({ resolve(specifier, context, next) {
    const stubs = {
      '@/db': 'export const getDb=async()=>globalThis.__sampleActionsDb;',
      '@/lib/auth': 'export const getCurrentAdmin=async()=>globalThis.__sampleActionsAdmin;export function assertSameOrigin(request){if(request.headers.get("origin")!==new URL(request.url).origin)throw new Error("Invalid origin");}',
      '@/lib/admin-audit': 'export const recordAdminAudit=async()=>true;',
      '@/lib/admin-notifications': 'export const createAdminNotification=async()=>{};',
      'cloudflare:workers': 'export const env={X_SETTINGS_ENCRYPTION_KEY:"' + 'K'.repeat(43) + '"};',
    };
    if (stubs[specifier]) return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, shortCircuit: true };
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !/\.[a-z]+$/i.test(specifier)) return { url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true };
    return next(specifier, context);
  } });
  try {
    const schema = await import('../db/schema.ts');
    for (const table of Object.values(schema)) {
      let config; try { config = getTableConfig(table); } catch { continue; }
      if (['collaboration_guards', 'review_reservations', 'settings_revision', 'private_profile_samples', 'private_sample_media'].includes(config.name)) continue;
      sqlite.exec(`CREATE TABLE IF NOT EXISTS "${config.name}" (${config.columns.filter(column => !['revision', 'admin_escort_limit_override'].includes(column.name)).map(column => `"${column.name}" ${column.getSQLType()}${column.primary ? ' PRIMARY KEY' : ''}`).join(',')})`);
    }
    sqlite.exec(await source('drizzle/0056_admin_collaboration.sql'));
    sqlite.exec(await source('drizzle/0062_private_profile_samples.sql'));
    sqlite.exec(await source('drizzle/0064_private_sample_workflow.sql'));
    sqlite.exec("INSERT INTO users(id,email,role,is_active,email_verified_at) VALUES('admin','admin@example.invalid','admin',1,'2026-01-01'),('owner','owner@example.invalid','visitor',1,'2026-01-01')");
    const admin = { id: 'admin', email: 'admin@example.invalid', displayName: 'Local administrator', githubLogin: 'local-admin', role: 'admin', accessLevel: 'administrator', isProtectedOwner: false };
    globalThis.__sampleActionsAdmin = admin;
    const service = await import('../lib/private-samples.ts');
    const policy = await import('../lib/private-sample-policy.ts');
    const links = await import('../lib/private-sample-links.ts');
    const { POST } = await import('../app/api/admin/muestras/[sampleId]/route.ts');
    const form = (changes = {}) => {
      const result = new FormData();
      for (const [key, value] of Object.entries({ type: 'escort', tier: 'vip', display_name: 'Muestra local de acciones', region: 'Región del Biobío', city: 'Concepción', short_description: 'Prueba local', description: 'Prueba de acciones privadas.', contact_whatsapp: '56911111111', gender: 'Femenino', age: '28', sample_permission: 'on', sample_provenance: 'otros', ...changes })) result.set(key, value);
      return result;
    };
    const create = async changes => service.getPrivateSample(await service.createPrivateSample(form(changes), admin));
    const call = async (row, action, changes = {}, options = {}) => {
      const body = options.form ?? new FormData();
      body.set('sample_action', action); body.set('review_key', 'sample:' + row.id); body.set('review_revision', String(options.revision ?? row.revision));
      for (const [key, value] of Object.entries(changes)) body.set(key, value);
      return POST(new Request('https://sample.invalid/api/admin/muestras/' + row.id, { method: 'POST', headers: { accept: 'application/json', origin: options.origin ?? 'https://sample.invalid' }, body }), { params: Promise.resolve({ sampleId: row.id }) });
    };
    const audits = (id, action) => sqlite.prepare('SELECT * FROM admin_audit_logs WHERE entity_id=? AND action=?').all(id, action);

    await t.test('sharing, reopening and copying keep the identical encrypted invitation and original deadline', async () => {
      const original = await create({ handle: 'stable-actions' });
      const share = await call(original, 'share'); assert.equal(share.status, 200);
      const first = await share.json(), saved = await service.getPrivateSample(original.id);
      assert.equal(first.expiresAt, original.expiresAt); assert.equal(saved.expiresAt, original.expiresAt);
      assert.equal(first.revision, saved.revision); assert.equal(audits(original.id, 'sample.share').length, 1);
      assert.ok(saved.tokenEncrypted.startsWith('v1.')); assert.ok(!saved.tokenEncrypted.includes(new URL(first.url).hash.slice(1)));
      assert.equal(await links.decryptPrivateSampleToken(saved.tokenEncrypted, saved.id), new URL(first.url).hash.slice(1));
      await assert.rejects(links.decryptPrivateSampleToken(saved.tokenEncrypted, 'another-sample'));
      await assert.rejects(links.decryptPrivateSampleToken(saved.tokenEncrypted, saved.id, 'L'.repeat(43)));
      for (const action of ['get_link', 'share', 'get_link']) {
        const response = await call(saved, action), result = await response.json();
        assert.equal(response.status, 200); assert.equal(result.url, first.url); assert.equal(result.expiresAt, first.expiresAt); assert.equal(result.revision, saved.revision);
      }
      assert.equal((await service.getPrivateSample(saved.id)).revision, saved.revision);
      assert.equal(audits(original.id, 'sample.share').length, 1);
      assert.ok(!JSON.stringify(audits(original.id, 'sample.share')).includes(new URL(first.url).hash.slice(1)));
    });

    await t.test('a legacy invitation can be adopted without changing its bearer, or retained alongside a recoverable invitation', async () => {
      const sample = await create({ handle: 'legacy-actions' }), token = policy.newSampleToken();
      sqlite.prepare('UPDATE private_profile_samples SET token_hash=? WHERE id=?').run(await policy.sampleTokenHash(token), sample.id);
      let row = await service.getPrivateSample(sample.id);
      let response = await call(row, 'get_link'), result = await response.json();
      assert.equal(response.status, 200); assert.equal(result.legacyLink, true); assert.ok(!result.url);
      response = await call(row, 'adopt_link', { previous_link: 'https://sample.invalid/muestra/' + row.id + '#' + token }); result = await response.json();
      assert.equal(response.status, 200); assert.equal(new URL(result.url).hash, '#' + token);
      row = await service.getPrivateSample(sample.id);
      assert.equal(row.expiresAt, sample.expiresAt); assert.equal(row.tokenHash, await policy.sampleTokenHash(token));
      assert.equal((await service.canOpenSample(sample.id, token)).id, sample.id);
      const second = await create({ handle: 'legacy-retained' }), previousToken = policy.newSampleToken();
      sqlite.prepare('UPDATE private_profile_samples SET token_hash=? WHERE id=?').run(await policy.sampleTokenHash(previousToken), second.id);
      row = await service.getPrivateSample(second.id);
      response = await call(row, 'share'); const newLink = await response.json();
      assert.equal(response.status, 200); assert.notEqual(new URL(newLink.url).hash, '#' + previousToken);
      assert.equal((await service.canOpenSample(second.id, previousToken)).id, second.id);
      assert.equal((await service.canOpenSample(second.handle, new URL(newLink.url).hash.slice(1))).id, second.id);
      assert.equal(audits(sample.id, 'sample.adopt_link').length, 1);
    });

    await t.test('manual contact tracking records the acting administrator and rejects old snapshots', async () => {
      const row = await create({ handle: 'contact-actions' });
      const response = await call(row, 'contact_mark', { return_to: '/admin/muestras?contact=pending&provenance=otros' });
      assert.equal(response.status, 200); const result = await response.json();
      const redirect = new URL(result.redirectTo); assert.equal(redirect.searchParams.get('contact'), 'pending'); assert.equal(redirect.searchParams.get('notice'), 'contact_marked');
      const saved = await service.getPrivateSample(row.id);
      assert.ok(saved.contactedAt); assert.equal(saved.contactedBy, 'admin'); assert.equal(saved.contactedByLogin, 'local-admin');
      assert.equal(audits(row.id, 'sample.contact_mark').length, 1);
      const stale = await call(row, 'contact_clear'); assert.equal(stale.status, 409); assert.equal((await stale.json()).conflict, true);
      assert.equal((await service.getPrivateSample(row.id)).contactedAt, saved.contactedAt);
      const cleared = await call(saved, 'contact_clear', { return_to: 'https://external.invalid/stolen' });
      assert.equal(cleared.status, 200); assert.equal(new URL((await cleared.json()).redirectTo).pathname, '/admin/muestras');
      assert.equal((await service.getPrivateSample(row.id)).contactedAt, null);
      assert.equal(audits(row.id, 'sample.contact_clear').length, 1);
    });

    await t.test('trash stops old access immediately, restore preserves the link, and revocation survives restoration', async () => {
      const original = await create({ handle: 'trash-actions' });
      const share = await call(original, 'share'), first = await share.json();
      let row = await service.getPrivateSample(original.id);
      const token = new URL(first.url).hash.slice(1);
      assert.equal((await call(row, 'trash')).status, 200);
      assert.equal(await service.canOpenSample(row.handle, token), null);
      row = await service.getPrivateSample(row.id);
      assert.equal((await call(row, 'contact_mark')).status, 400);
      assert.equal((await call(row, 'get_link')).status, 400);
      assert.equal((await call(row, 'restore')).status, 200);
      row = await service.getPrivateSample(row.id);
      assert.equal((await service.canOpenSample(row.handle, token)).id, row.id);
      assert.equal((await (await call(row, 'get_link')).json()).url, first.url);
      assert.ok(row.expiresAt >= original.expiresAt);
      assert.equal((await call(row, 'revoke')).status, 200);
      row = await service.getPrivateSample(row.id);
      assert.equal(await service.canOpenSample(row.handle, token), null);
      assert.equal(row.tokenHash, null); assert.equal(row.legacyTokenHash, null); assert.equal(row.tokenEncrypted, null);
      await call(row, 'trash'); row = await service.getPrivateSample(row.id);
      await call(row, 'restore'); row = await service.getPrivateSample(row.id);
      assert.equal(await service.canOpenSample(row.handle, token), null);
      assert.equal((await (await call(row, 'get_link')).json()).legacyLink, false);
    });

    await t.test('mutation and audit are rolled back together and permanent deletion requires the paper bin', async () => {
      const row = await create({ handle: 'delete-actions' });
      assert.equal((await call(row, 'delete', { confirmation: 'ELIMINAR' })).status, 400);
      sqlite.exec("CREATE TRIGGER reject_contact_audit BEFORE INSERT ON admin_audit_logs WHEN NEW.action='sample.contact_mark' BEGIN SELECT RAISE(ABORT,'qa_audit_failure'); END;");
      assert.equal((await call(row, 'contact_mark')).status, 500);
      assert.equal((await service.getPrivateSample(row.id)).contactedAt, null);
      assert.equal((await service.getPrivateSample(row.id)).revision, row.revision);
      sqlite.exec('DROP TRIGGER reject_contact_audit');
      sqlite.prepare('INSERT INTO private_sample_media VALUES(?,?,?,?,?,?,?,?)').run('file-delete-actions', row.id, 'private-samples/delete-actions/file.webp', 12, 'image/webp', 'image', 1, 0);
      let saved = await service.getPrivateSample(row.id); await call(saved, 'trash'); saved = await service.getPrivateSample(row.id);
      assert.equal((await call(saved, 'delete', { confirmation: 'wrong' })).status, 400);
      assert.equal((await call(saved, 'delete', { confirmation: 'ELIMINAR' })).status, 200);
      assert.equal(await service.getPrivateSample(row.id), null);
      assert.equal(sqlite.prepare("SELECT count(*) n FROM data_deletion_jobs WHERE r2_key='private-samples/delete-actions/file.webp'").get().n, 1);
      assert.equal(audits(row.id, 'sample.delete').length, 1);
    });

    await t.test('the API rejects missing administrative permission, other origins, expired mutations and an unknown action', async () => {
      const row = await create({ handle: 'denied-actions' });
      globalThis.__sampleActionsAdmin = null;
      assert.equal((await call(row, 'share')).status, 403);
      globalThis.__sampleActionsAdmin = { ...admin, accessLevel: 'moderator' };
      assert.equal((await call(row, 'share')).status, 403);
      globalThis.__sampleActionsAdmin = admin;
      assert.equal((await call(row, 'share', {}, { origin: 'https://external.invalid' })).status, 403);
      assert.equal((await call(row, 'invalid_action')).status, 400);
      sqlite.prepare('UPDATE private_profile_samples SET expires_at=? WHERE id=?').run(Date.now() - 1, row.id);
      const expired = await service.getPrivateSample(row.id);
      assert.equal((await call(expired, 'share')).status, 400);
      assert.equal((await call(expired, 'contact_mark')).status, 400);
      assert.equal((await service.getPrivateSample(row.id)).contactedAt, null);
    });
  } finally { hooks.deregister(); sqlite.close(); delete globalThis.__sampleActionsDb; delete globalThis.__sampleActionsAdmin; }
});
