import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { sampleFormJson, sampleCanEdit, sampleListStatus, sampleIsAvailable, sampleTrashDeadline, SAMPLE_RETENTION_MS, SAMPLE_LIFETIME_MS } from '../lib/private-sample-policy.ts';
import { boundedSampleFilter, samplePhoneSearchTerms } from '../lib/private-sample-filters.ts';
const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('phone search accepts Chilean country codes, local and partial numbers without treating arbitrary text as a phone', () => {
  assert.deepEqual(samplePhoneSearchTerms('+56 (9) 8765-4321'), ['56987654321', '987654321']);
  assert.deepEqual(samplePhoneSearchTerms('0056 9 8765 4321'), ['0056987654321', '987654321']);
  assert.deepEqual(samplePhoneSearchTerms('0987654321'), ['0987654321', '987654321']);
  assert.deepEqual(samplePhoneSearchTerms('987654321'), ['987654321']);
  assert.deepEqual(samplePhoneSearchTerms('+56 9 876'), ['569876', '9876']);
  assert.deepEqual(samplePhoneSearchTerms('8765'), ['8765']);
  for (const value of ['abc', '9%87', "9' OR 1=1--", 'x'.repeat(200), null, 123]) assert.deepEqual(samplePhoneSearchTerms(value), []);
  assert.equal(boundedSampleFilter('  abc  '), 'abc'); assert.equal(boundedSampleFilter(null), ''); assert.equal(boundedSampleFilter('abcde', 3), 'abc');
});

function adapter(sqlite, beforeBatch = () => {}) {
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
  return { prepare, async batch(statements) {
    beforeBatch();
    sqlite.exec('BEGIN');
    try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
}

test('sample lifecycle distinguishes trash, conversion and contact-independent availability', () => {
  const row = { expiresAt: 1001, migratedAt: null, tokenHash: 'hash', trashedAt: null };
  assert.equal(sampleListStatus(row, 1000), 'active');
  assert.equal(sampleListStatus({ ...row, tokenHash: null }, 1000), 'unshared');
  assert.equal(sampleListStatus(row, 1001), 'trashed');
  assert.equal(sampleListStatus({ ...row, migratedAt: 'done' }, 1001), 'migrated');
  assert.equal(sampleListStatus({ ...row, trashedAt: 900 }, 1000), 'trashed');
  assert.equal(sampleIsAvailable({ ...row, tokenHash: null, legacyTokenHash: 'legacy' }, 1000), true);
  assert.equal(sampleIsAvailable({ ...row, trashedAt: 900 }, 1000), false);
  assert.equal(sampleCanEdit({ ...row, migratedAt: 'done' }, 1000), false);
  assert.equal(sampleTrashDeadline({ ...row, trashedAt: 900 }), 900 + SAMPLE_RETENTION_MS);
  assert.equal(sampleTrashDeadline(row), row.expiresAt + SAMPLE_RETENTION_MS);
});

test('private sample workflow runs against migration triggers, D1 batches and concurrent snapshots', async t => {
  let beforeBatch;
  const sqlite = new DatabaseSync(':memory:'), binding = adapter(sqlite, () => { const callback = beforeBatch; beforeBatch = null; callback?.(); });
  const db = drizzle(binding);
  globalThis.__sampleWorkflowDb = db;
  const hooks = registerHooks({ resolve(specifier, context, next) {
    const stubs = {
      '@/db': 'export const getDb=async()=>globalThis.__sampleWorkflowDb;',
      '@/lib/admin-notifications': 'export const createAdminNotification=async()=>{};',
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
    sqlite.exec("INSERT INTO users(id,email,role,is_active,email_verified_at) VALUES('admin','admin@example.invalid','admin',1,'2026-01-01'),('owner','owner@example.invalid','visitor',1,'2026-01-01'),('second','second@example.invalid','visitor',1,'2026-01-01'),('blocked','blocked@example.invalid','visitor',0,'2026-01-01'),('unverified','unverified@example.invalid','visitor',1,NULL)");
    const legacyId = 'sam_00000000-0000-4000-8000-000000000000';
    sqlite.prepare('INSERT INTO private_profile_samples(id,display_name,form_json,expires_at,created_by) VALUES(?,?,?,?,?)').run(legacyId, 'Legacy sample', '[]', Date.now() + 10000, 'admin');
    sqlite.exec(await source('drizzle/0064_private_sample_workflow.sql'));
    assert.match(sqlite.prepare('SELECT handle FROM private_profile_samples WHERE id=?').get(legacyId).handle, /^m-[a-f0-9]{8}-[a-f0-9]+$/);
    const service = await import('../lib/private-samples.ts');
    const { CollaborationConflict } = await import('../lib/collaboration.ts');
    const { newSampleToken, sampleTokenHash } = await import('../lib/private-sample-policy.ts');
    const admin = { id: 'admin', email: 'admin@example.invalid', displayName: 'Local administrator', githubLogin: 'local-admin', role: 'admin', accessLevel: 'administrator', isProtectedOwner: false };
    const form = (changes = {}) => {
      const result = new FormData();
      for (const [key, value] of Object.entries({ type: 'escort', tier: 'vip', display_name: 'Muestra local', region: 'Región del Biobío', city: 'Concepción', short_description: 'Prueba local', description: 'Prueba local de flujo privado.', contact_whatsapp: '56911111111', gender: 'Femenino', age: '28', sample_permission: 'on', sample_provenance: 'sexosur', ...changes })) result.set(key, value);
      return result;
    };
    const version = row => ({ key: 'sample:' + row.id, revision: row.revision });
    const create = async (changes = {}) => service.getPrivateSample(await service.createPrivateSample(form(changes), admin));
    const addPhoto = row => sqlite.prepare('INSERT INTO private_sample_media VALUES(?,?,?,?,?,?,?,?)').run('media-' + row.id, row.id, 'private-samples/' + row.id + '/file.webp', 123, 'image/webp', 'image', 1, 0);

    await t.test('new short handles are stable through edits, while provenance remains a separate field', async () => {
      const row = await create();
      assert.ok(row.handle.length < 40); assert.match(row.handle, /^muestra-local-/);
      assert.equal(row.provenance, 'sexosur'); assert.ok(!row.formJson.includes('sample_provenance'));
      await service.updatePrivateSample(row.id, form({ display_name: 'Otro nombre', sample_provenance: 'relaxchile' }), version(row), admin);
      const saved = await service.getPrivateSample(row.id);
      assert.equal(saved.handle, row.handle); assert.equal(saved.displayName, 'Otro nombre'); assert.equal(saved.provenance, 'relaxchile');
      await assert.rejects(service.updatePrivateSample(row.id, form(), version(row), admin), CollaborationConflict);
      assert.equal((await service.resolvePrivateSample(row.handle)).id, row.id);
      assert.equal((await service.resolvePrivateSample(row.id)).id, row.id);
      assert.equal(await service.resolvePrivateSample('../invalid'), null);
    });

    await t.test('both old and newly persisted invitations resolve aliases but trash, expiry and revocation win', async () => {
      const row = await create({ handle: 'sample-invitation' }), oldToken = newSampleToken(), newToken = newSampleToken();
      sqlite.prepare('UPDATE private_profile_samples SET token_hash=?,legacy_token_hash=? WHERE id=?').run(await sampleTokenHash(newToken), await sampleTokenHash(oldToken), row.id);
      assert.equal((await service.canOpenSample(row.id, oldToken)).id, row.id);
      assert.equal((await service.canOpenSample(row.handle, newToken)).id, row.id);
      assert.equal(await service.canOpenSample(row.handle, newSampleToken()), null);
      sqlite.prepare('UPDATE private_profile_samples SET trashed_at=? WHERE id=?').run(Date.now(), row.id);
      assert.equal(await service.canOpenSample(row.handle, newToken), null);
      sqlite.prepare('UPDATE private_profile_samples SET trashed_at=NULL,expires_at=? WHERE id=?').run(Date.now() - 1, row.id);
      assert.equal(await service.canOpenSample(row.handle, newToken), null);
      sqlite.prepare('UPDATE private_profile_samples SET expires_at=?,token_hash=NULL,legacy_token_hash=NULL WHERE id=?').run(Date.now() + 10000, row.id);
      assert.equal(await service.canOpenSample(row.id, oldToken), null);
    });

    await t.test('contact filters and ordering keep pending outreach first without exposing the stored form', async () => {
      const pending = await create({ display_name: 'Filtro único pendiente', sample_provenance: 'publiescort' });
      const contacted = await create({ display_name: 'Filtro único contactado', sample_provenance: 'publiescort' });
      sqlite.prepare("UPDATE private_profile_samples SET contacted_at=?,contacted_by='admin',contacted_by_login='local-admin',updated_at='2099-01-01' WHERE id=?").run(new Date().toISOString(), contacted.id);
      const rows = await service.listPrivateSamples({ q: 'Filtro único', provenance: 'publiescort' });
      assert.deepEqual(rows.map(row => row.id), [pending.id, contacted.id]);
      assert.equal(rows[0].age, 28); assert.equal(rows[0].city, 'Concepción'); assert.equal(rows[0].contactWhatsapp, '56911111111');
      assert.ok(!('formJson' in rows[0])); assert.ok(!('tokenHash' in rows[0]));
      assert.deepEqual((await service.listPrivateSamples({ q: 'Filtro único', contact: 'pending' })).map(row => row.id), [pending.id]);
      assert.deepEqual((await service.listPrivateSamples({ q: 'Filtro único', contact: 'contacted' })).map(row => row.id), [contacted.id]);
      assert.deepEqual(await service.listPrivateSamples({ q: '%' }), []);
      sqlite.prepare('UPDATE private_profile_samples SET expires_at=? WHERE id=?').run(Date.now() - 1, pending.id);
      assert.equal((await service.listPrivateSamples({ q: 'Filtro único', contact: 'pending', view: 'trash' }))[0].id, pending.id);
      assert.equal((await service.listPrivateSamples({ q: 'Filtro único' })).length, 1);
    });

    await t.test('region, city, phone and gender filters combine before limiting results and match the correct entry pairs', async () => {
      const local = await create({ display_name: 'Territorial único local', handle: 'territorial-local', region: 'Región del Biobío', city: 'Concepción', contact_whatsapp: '987654321', contact_phone: '56944332211', sample_provenance: 'elsilencio' });
      const capital = await create({ display_name: 'Territorial único capital', handle: 'territorial-capital', region: 'Región Metropolitana de Santiago', city: 'Santiago Centro', contact_whatsapp: '56987654321', gender: 'Masculino', sample_provenance: 'elsilencio' });
      const formatted = await create({ display_name: 'Territorial único formato', handle: 'territorial-formato', region: 'Región del Biobío', city: 'Los Ángeles', contact_whatsapp: '56922223333', sample_provenance: 'elsilencio' });
      const formattedForm = form({ display_name: 'Territorial único formato', region: 'Región del Biobío', city: 'Los Ángeles', contact_whatsapp: '+56\u202f(9) 8765-4321', sample_provenance: 'elsilencio' });
      sqlite.prepare('UPDATE private_profile_samples SET form_json=?,contacted_at=?,contacted_by_login=? WHERE id=?').run(sampleFormJson(formattedForm), new Date().toISOString(), 'local-admin', formatted.id);
      const ids = async filters => (await service.listPrivateSamples({ q: 'Territorial único', ...filters })).map(row => row.id);
      assert.deepEqual(await ids({ region: 'Región del Biobío', city: 'Concepción', phone: '+56 (9) 8765-4321', gender: 'Femenino', provenance: 'elsilencio', contact: 'pending' }), [local.id]);
      assert.deepEqual(await ids({ city: 'Santiago Centro', phone: '987654321', gender: 'Masculino' }), [capital.id]);
      assert.deepEqual(await ids({ region: 'Región del Biobío', city: 'Santiago Centro' }), []);
      assert.deepEqual(await ids({ region: 'Región del Biobío', city: 'Los Ángeles', contact: 'contacted', phone: '569876' }), [formatted.id]);
      assert.deepEqual(await ids({ phone: '944332211' }), [local.id]);
      assert.deepEqual(await ids({ phone: '4433' }), [local.id]);
      for (const needle of ['987654321', '+56 (9) 8765-4321', '0056 9 8765 4321']) {
        const result = await service.listPrivateSamples({ phone: needle, provenance: 'elsilencio' });
        assert.equal(result.length, 3); assert.equal(result.at(-1).id, formatted.id);
      }
      assert.equal((await service.listPrivateSamples({ q: '+56 (9) 8765-4321', region: 'Región Metropolitana de Santiago' }))[0].id, capital.id);
      assert.equal((await service.listPrivateSamples({ q: '@territorial-local' }))[0].id, local.id);
      for (const filters of [{ region: "x' OR 1=1--" }, { city: '%' }, { gender: 'anything' }, { phone: '%' }, { phone: "9' OR 1=1--" }, { q: "%' OR 1=1--" }]) assert.deepEqual(await service.listPrivateSamples(filters), []);
      // SQL filters inspect actual field/value pairs, not another field that
      // happens to contain the region, city, phone or gender as prose.
      const misleading = await create({ display_name: 'Territorial único descripción', region: 'Región de Valparaíso', city: 'Valparaíso', contact_whatsapp: '56922224444', description: 'Región del Biobío Concepción Femenino 987654321' });
      assert.ok(!(await ids({ region: 'Región del Biobío' })).includes(misleading.id));
      assert.ok(!(await ids({ city: 'Concepción' })).includes(misleading.id));
      assert.ok(!(await ids({ phone: '987654321' })).includes(misleading.id));
      // Place more than 100 newer irrelevant rows ahead of a target. Location
      // filtering must happen in SQL, before the administrative result cap.
      const insert = sqlite.prepare('INSERT INTO private_profile_samples(id,handle,display_name,form_json,expires_at,created_by,updated_at) VALUES(?,?,?,?,?,?,?)');
      for (let index = 0; index < 105; index++) insert.run(`sam_10000000-0000-4000-8000-${String(index).padStart(12, '0')}`, `filter-cap-${index}`, 'Fixture cap', sampleFormJson(form({ region: 'Región del Maule', city: 'Talca' })), Date.now() + 10000, 'admin', '2099-01-01');
      assert.ok((await service.listPrivateSamples({ region: 'Región del Biobío', city: 'Concepción', phone: '+56 9 8765 4321' })).some(row => row.id === local.id));
    });

    await t.test('invalid JSON and malformed entry shapes cannot break filtered queries or become territorial matches', async () => {
      const values = ['not-json', 'null', '{"region":"Región del Biobío"}', '["region","Región del Biobío"]', '[42,null,{"city":"Concepción"}]', '[["region",42],["city",null]]'];
      const rows = [];
      for (const [index, value] of values.entries()) {
        const row = await create({ display_name: 'Malformed local ' + index }); rows.push(row);
        sqlite.prepare('UPDATE private_profile_samples SET form_json=? WHERE id=?').run(value, row.id);
      }
      for (const filters of [{ region: 'Región del Biobío' }, { city: 'Concepción' }, { phone: '+56 9 8765 4321' }, { gender: 'Femenino' }]) {
        const result = await service.listPrivateSamples({ q: 'Malformed local', ...filters });
        assert.deepEqual(result, []);
      }
      assert.equal((await service.listPrivateSamples({ q: 'Malformed local' })).length, rows.length);
    });

    await t.test('conversion validates target, transfers files atomically and keeps identity unreviewed', async () => {
      const sample = await create({ handle: 'first-migration' }); addPhoto(sample);
      await assert.rejects(service.getSampleMigrationTarget('blocked@example.invalid'), /activa/);
      await assert.rejects(service.getSampleMigrationTarget('unverified@example.invalid'), /verificar/);
      const row = await service.getPrivateSample(sample.id), target = await service.getSampleMigrationTarget('owner@example.invalid');
      assert.equal(target.escortCount, 0); assert.equal(target.requiresAdditionalEscortConfirmation, false);
      const profileId = await service.migratePrivateSample(row, target.email, version(row), admin);
      const profile = sqlite.prepare('SELECT * FROM profiles WHERE id=?').get(profileId);
      assert.equal(profile.verification_status, 'unreviewed'); assert.equal(profile.status, 'approved'); assert.equal(profile.admin_escort_limit_override, 0);
      assert.equal(sqlite.prepare('SELECT role FROM users WHERE id=?').get('owner').role, 'advertiser');
      assert.equal(sqlite.prepare('SELECT count(*) n FROM private_sample_media WHERE sample_id=?').get(row.id).n, 0);
      assert.equal(sqlite.prepare('SELECT r2_key FROM profile_media WHERE profile_id=?').get(profileId).r2_key, 'private-samples/' + row.id + '/file.webp');
      const converted = await service.getPrivateSample(row.id);
      assert.equal(converted.migratedProfileId, profileId); assert.equal(converted.tokenHash, null); assert.equal(converted.tokenEncrypted, null); assert.notEqual(converted.formJson, '[]');
      assert.equal(sqlite.prepare("SELECT count(*) n FROM admin_audit_logs WHERE action='sample.migrate' AND entity_id=?").get(row.id).n, 1);
      await assert.rejects(service.migratePrivateSample(row, target.email, version(row), admin), CollaborationConflict);
    });

    await t.test('an additional Escort needs explicit current confirmation without lifting the normal account limit', async () => {
      const sample = await create({ handle: 'second-migration' }); addPhoto(sample);
      const row = await service.getPrivateSample(sample.id);
      const target = await service.getSampleMigrationTarget('owner@example.invalid');
      assert.equal(target.escortCount, 1); assert.equal(target.requiresAdditionalEscortConfirmation, true);
      await assert.rejects(service.migratePrivateSample(row, target.email, version(row), admin), error => error instanceof service.SampleEscortLimitConflict && error.target.escortCount === 1);
      await assert.rejects(service.migratePrivateSample(row, target.email, version(row), admin, { allowAdditionalEscort: true }), CollaborationConflict);
      await assert.rejects(service.migratePrivateSample(row, target.email, version(row), admin, { allowAdditionalEscort: true, expectedOwnerId: target.ownerId, expectedOwnerRevision: target.revision - 1, expectedEscortCount: 1 }), CollaborationConflict);
      await assert.rejects(service.migratePrivateSample(row, target.email, version(row), admin, { allowAdditionalEscort: true, expectedOwnerId: 'different-account', expectedOwnerRevision: target.revision, expectedEscortCount: 1 }), CollaborationConflict);
      const profileId = await service.migratePrivateSample(row, target.email, version(row), admin, { allowAdditionalEscort: true, expectedOwnerId: target.ownerId, expectedOwnerRevision: target.revision, expectedEscortCount: 1 });
      assert.equal(sqlite.prepare('SELECT admin_escort_limit_override flag FROM profiles WHERE id=?').get(profileId).flag, 1);
      assert.throws(() => sqlite.exec("INSERT INTO profiles(id,owner_id,type,trashed_at,admin_escort_limit_override) VALUES('forbidden','owner','escort',NULL,0)"), /escort_profile_owner_conflict/);
      assert.throws(() => sqlite.exec("INSERT INTO profiles(id,owner_id,type,trashed_at,creation_source,admin_escort_limit_override) VALUES('forged','owner','escort',NULL,'self',1)"), /escort_profile_owner_conflict/);
      sqlite.exec("INSERT INTO profiles(id,owner_id,type,trashed_at) VALUES('other-listing','second','escort',NULL)");
      assert.throws(() => sqlite.prepare('UPDATE profiles SET owner_id=? WHERE id=?').run('second', profileId), /escort_profile_owner_conflict/);
      const audit = JSON.parse(sqlite.prepare("SELECT after_data FROM admin_audit_logs WHERE entity_id=? AND action='sample.migrate'").get(row.id).after_data);
      assert.equal(audit.additionalEscortAuthorized, true);
    });

    await t.test('an allowed ownership transfer clears the old exception before a later trash/create/restore cycle', () => {
      const profile = sqlite.prepare('SELECT id,revision FROM profiles WHERE admin_escort_limit_override=1').get();
      sqlite.prepare('UPDATE profiles SET owner_id=owner_id WHERE id=?').run(profile.id);
      assert.equal(sqlite.prepare('SELECT admin_escort_limit_override flag FROM profiles WHERE id=?').get(profile.id).flag, 1);
      sqlite.exec("INSERT INTO users(id,email,role,is_active,email_verified_at) VALUES('transfer-owner','transfer@example.invalid','advertiser',1,'2026-01-01')");
      sqlite.prepare('UPDATE profiles SET owner_id=? WHERE id=?').run('transfer-owner', profile.id);
      const transferred = sqlite.prepare('SELECT revision,admin_escort_limit_override flag FROM profiles WHERE id=?').get(profile.id);
      assert.equal(transferred.flag, 0); assert.ok(transferred.revision > profile.revision);
      sqlite.prepare('UPDATE profiles SET trashed_at=? WHERE id=?').run(new Date().toISOString(), profile.id);
      sqlite.exec("INSERT INTO profiles(id,owner_id,type,trashed_at) VALUES('transfer-ordinary','transfer-owner','escort',NULL)");
      assert.throws(() => sqlite.prepare('UPDATE profiles SET trashed_at=NULL WHERE id=?').run(profile.id), /escort_profile_owner_conflict/);
    });

    await t.test('a failed transactional audit rolls conversion back, leaving sample files privately owned', async () => {
      const sample = await create({ handle: 'rollback-migration' }); addPhoto(sample);
      sqlite.exec("INSERT INTO users(id,email,role,is_active,email_verified_at) VALUES('rollback-owner','rollback@example.invalid','visitor',1,'2026-01-01'); CREATE TRIGGER fail_sample_audit BEFORE INSERT ON admin_audit_logs WHEN NEW.action='sample.migrate' BEGIN SELECT RAISE(ABORT,'qa_audit_failure'); END;");
      const row = await service.getPrivateSample(sample.id);
      await assert.rejects(service.migratePrivateSample(row, 'rollback@example.invalid', version(row), admin), /qa_audit_failure/);
      assert.equal(sqlite.prepare("SELECT count(*) n FROM profiles WHERE owner_id='rollback-owner'").get().n, 0);
      assert.equal((await service.getPrivateSample(row.id)).migratedAt, null);
      assert.equal(sqlite.prepare('SELECT count(*) n FROM private_sample_media WHERE sample_id=?').get(row.id).n, 1);
      sqlite.exec('DROP TRIGGER fail_sample_audit');
    });

    await t.test('an account changed during the conversion cannot bypass the final transactional owner/count guard', async () => {
      const sample = await create({ handle: 'racing-migration' }); addPhoto(sample);
      sqlite.exec("INSERT INTO users(id,email,role,is_active,email_verified_at) VALUES('racing-owner','race@example.invalid','visitor',1,'2026-01-01')");
      const row = await service.getPrivateSample(sample.id);
      beforeBatch = () => sqlite.exec("INSERT INTO profiles(id,owner_id,type,trashed_at) VALUES('concurrent-escort','racing-owner','escort',NULL)");
      await assert.rejects(service.migratePrivateSample(row, 'race@example.invalid', version(row), admin), CollaborationConflict);
      assert.equal(sqlite.prepare("SELECT count(*) n FROM profiles WHERE owner_id='racing-owner'").get().n, 1);
      assert.equal((await service.getPrivateSample(row.id)).migratedAt, null);
      assert.equal(sqlite.prepare('SELECT count(*) n FROM private_sample_media WHERE sample_id=?').get(row.id).n, 1);
      assert.equal(sqlite.prepare("SELECT count(*) n FROM admin_audit_logs WHERE action='sample.migrate' AND entity_id=?").get(row.id).n, 0);
    });

    await t.test('retention moves expired samples to trash and purges only after 30 days, preserving converted objects and concurrent restores', async () => {
      const { purgeExpiredSamples } = await import('../worker/private-sample-cleanup.ts');
      const now = Date.now(), expired = await create({ handle: 'retention-expired' }), restored = await create({ handle: 'retention-restored' }), manual = await create({ handle: 'retention-manual' });
      for (const row of [expired, restored, manual]) addPhoto(row);
      sqlite.prepare('UPDATE private_profile_samples SET expires_at=? WHERE id IN (?,?)').run(now - SAMPLE_RETENTION_MS - 1, expired.id, restored.id);
      sqlite.prepare('UPDATE private_profile_samples SET trashed_at=?,trash_reason=? WHERE id=?').run(now - SAMPLE_RETENTION_MS + 1000, 'manual', manual.id);
      const converted = sqlite.prepare('SELECT id FROM private_profile_samples WHERE migrated_at IS NOT NULL LIMIT 1').get();
      sqlite.prepare('UPDATE private_profile_samples SET migrated_at=? WHERE id=?').run(new Date(now - SAMPLE_RETENTION_MS - 1000).toISOString(), converted.id);
      let once = false;
      const racing = { prepare: binding.prepare, async batch(statements) {
        if (!once) { once = true; sqlite.prepare('UPDATE private_profile_samples SET trashed_at=NULL,trash_reason=NULL,expires_at=? WHERE id=?').run(now + SAMPLE_LIFETIME_MS, restored.id); }
        return binding.batch(statements);
      } };
      await purgeExpiredSamples(racing, now);
      assert.equal(await service.getPrivateSample(expired.id), null);
      assert.equal((await service.getPrivateSample(restored.id)).trashedAt, null);
      assert.ok(await service.getPrivateSample(manual.id));
      assert.equal(await service.getPrivateSample(converted.id), null);
      const keys = sqlite.prepare('SELECT r2_key FROM data_deletion_jobs').all().map(row => row.r2_key);
      assert.deepEqual(keys, ['private-samples/' + expired.id + '/file.webp']);
      assert.ok(sqlite.prepare('SELECT count(*) n FROM profile_media').get().n >= 2);
    });
  } finally { hooks.deregister(); sqlite.close(); delete globalThis.__sampleWorkflowDb; }
});
