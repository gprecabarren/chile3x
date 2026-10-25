import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {drizzle} from 'drizzle-orm/d1';
import {getTableConfig} from 'drizzle-orm/sqlite-core';

test('legacy derived tags reconcile atomically while contact edits preserve existing moderation', async t => {
  const sqlite = new DatabaseSync(':memory:');
  const prepare = (query, args = []) => ({
    bind: (...values) => prepare(query, values),
    execute() {
      const statement = sqlite.prepare(query);
      if (statement.columns().length) return {results: statement.all(...args)};
      const result = statement.run(...args);
      return {results: [], meta: {changes: Number(result.changes)}};
    },
    async all() { return this.execute(); },
    async run() { return this.execute(); },
    async raw() { const statement = sqlite.prepare(query); statement.setReturnArrays(true); return statement.all(...args); },
  });
  const db = drizzle({prepare, async batch(statements) {
    sqlite.exec('BEGIN');
    try { const result = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return result; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }});
  globalThis.__legacyContactTagDb = db;
  const hooks = registerHooks({resolve(specifier, context, next) {
    const stubs = {
      '@/db': 'export const getDb=async()=>globalThis.__legacyContactTagDb;',
      '@/lib/admin-notifications': 'export const createAdminNotification=async()=>{};',
    };
    if (stubs[specifier]) return {url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true};
    if (specifier.startsWith('@/')) return {url: new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, shortCircuit: true};
    return next(specifier, context);
  }});
  try {
    const schema = await import('../db/schema.ts');
    for (const table of Object.values(schema)) {
      let config; try { config = getTableConfig(table); } catch { continue; }
      if (['collaboration_guards', 'review_reservations', 'settings_revision'].includes(config.name)) continue;
      sqlite.exec(`CREATE TABLE IF NOT EXISTS "${config.name}" (${config.columns.filter(column => column.name !== 'revision').map(column => `"${column.name}" ${column.getSQLType()}${column.primary ? ' PRIMARY KEY' : ''}`).join(',')})`);
    }
    for (const path of ['0056_admin_collaboration.sql', '0063_incompatible_profile_tags.sql']) {
      sqlite.exec(await readFile(new URL('../drizzle/' + path, import.meta.url), 'utf8'));
    }
    sqlite.exec('CREATE UNIQUE INDEX profile_tag_unique ON profile_tags(profile_id,tag)');
    sqlite.exec("INSERT INTO users(id,email,role) VALUES('owner','qa@example.invalid','advertiser')");
    const {readProfileSubmission, updateProfile, ProfileValidationError} = await import('../lib/profile-submission.ts');
    const {CollaborationConflict} = await import('../lib/collaboration.ts');
    const form = (gender, overrides = {}) => {
      const data = new FormData();
      for (const [key, value] of Object.entries({
        type: 'escort', tier: 'vip', display_name: 'Anuncio local', region: 'Región del Biobío', city: 'Concepción',
        short_description: 'Descripción local', description: 'Prueba temporal de contactos y moderación.',
        contact_whatsapp: '56911111111', gender, age: '28', intent: 'submit',
        tags: ['masajes'], services_included: ['Hoteles'], ...overrides,
      })) for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
      return data;
    };
    let count = 0;
    const fixture = async (gender, tags, status = 'approved') => {
      const submission = readProfileSubmission(form(gender));
      const id = 'legacy_' + ++count;
      await db.insert(schema.profiles).values({
        id, ownerId: 'owner', type: 'escort', status, tier: submission.tier, slug: id, handle: id,
        displayName: submission.displayName, region: submission.region, city: submission.city, comuna: submission.comuna,
        shortDescription: submission.shortDescription, description: submission.description,
        contactWhatsapp: submission.contactWhatsapp, contactTelegram: null, verificationStatus: 'reviewed',
      });
      await db.insert(schema.profileDetails).values({profileId: id, ...submission.details});
      for (const tag of tags) await db.insert(schema.profileTags).values({id: id + '_' + tag, profileId: id, tag});
      await db.insert(schema.profileServices).values({id: id + '_service', profileId: id, kind: 'included', service: 'Hoteles'});
      return id;
    };
    const state = id => ({
      profile: sqlite.prepare('SELECT * FROM profiles WHERE id=?').get(id),
      details: sqlite.prepare('SELECT * FROM profile_details WHERE profile_id=?').get(id),
      tags: sqlite.prepare('SELECT * FROM profile_tags WHERE profile_id=? ORDER BY tag').all(id),
      services: sqlite.prepare('SELECT * FROM profile_services WHERE profile_id=? ORDER BY id').all(id),
    });
    const edit = (id, data, revision = state(id).profile.revision) => updateProfile(id, 'owner', readProfileSubmission(data), {version: {key: 'profile:' + id, revision}});

    for (const [gender, tags, expected] of [
      ['Masculino', ['masajes'], ['hombres', 'masajes']],
      ['Femenino', ['hombres', 'masajes'], ['masajes']],
      ['Masculino', ['hombres', 'masajes'], ['hombres', 'masajes']],
    ]) await t.test(gender + '/' + tags.join(','), async () => {
      const id = await fixture(gender, tags), before = state(id);
      assert.deepEqual(await edit(id, form(gender, {contact_whatsapp: '56922222222'})), {updated: true, contactOnly: true});
      const after = state(id);
      assert.equal(after.profile.status, 'approved');
      assert.equal(after.profile.verification_status, 'reviewed');
      assert.equal(after.profile.contact_whatsapp, '56922222222');
      assert.deepEqual(after.tags.map(row => row.tag), expected);
      assert.deepEqual(after.tags.filter(row => row.tag !== 'hombres'), before.tags.filter(row => row.tag !== 'hombres'));
      assert.deepEqual(after.services, before.services, 'Contact saves must preserve services and their identities');
    });

    await t.test('gender, service and manual tag changes still require review; pending listings never publish', async () => {
      for (const overrides of [{gender: 'Femenino'}, {tags: ['masajes', 'trans']}, {services_included: ['Domicilio']}]) {
        const id = await fixture('Masculino', ['masajes']);
        assert.equal((await edit(id, form('Masculino', overrides))).contactOnly, false);
        assert.equal(state(id).profile.status, 'pending');
      }
      const id = await fixture('Masculino', ['masajes'], 'pending');
      assert.equal((await edit(id, form('Masculino'))).contactOnly, false);
      assert.equal(state(id).profile.status, 'pending');
    });

    await t.test('incompatible MILF and stale versions cannot partially reconcile old listings', async () => {
      const id = await fixture('Masculino', ['masajes']), before = state(id);
      assert.throws(() => readProfileSubmission(form('Masculino', {tags: ['milf']})), ProfileValidationError);
      await assert.rejects(edit(id, form('Masculino', {contact_whatsapp: '56922222222'}), before.profile.revision - 1), CollaborationConflict);
      assert.deepEqual(state(id), before);
    });

    await t.test('a derived-tag write failure rolls back contact, metadata and revision together', async () => {
      const id = await fixture('Masculino', ['masajes']), before = state(id);
      sqlite.exec(`CREATE TRIGGER fail_derived_tag BEFORE INSERT ON profile_tags WHEN NEW.profile_id='${id}' AND NEW.tag='hombres' BEGIN SELECT RAISE(ABORT,'fixture_reconciliation_failure'); END`);
      await assert.rejects(edit(id, form('Masculino', {contact_whatsapp: '56922222222'})), /fixture_reconciliation_failure/);
      assert.deepEqual(state(id), before);
    });
  } finally {
    hooks.deregister(); sqlite.close(); delete globalThis.__legacyContactTagDb;
  }
});
