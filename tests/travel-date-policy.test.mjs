import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {drizzle} from 'drizzle-orm/d1';
import {getTableConfig} from 'drizzle-orm/sqlite-core';
import {travelDateBounds, travelDateError, travelDateShapeError, currentTravelAgenda} from '../lib/travel-date-policy.ts';

test('travel bounds follow the day and year in Chile, including midnight and daylight saving', () => {
  for (const [instant, min, max] of [
    ['2026-10-25T02:59:59.999Z', '2026-10-24', '2027-12-31'],
    ['2026-10-25T03:00:00.000Z', '2026-10-25', '2027-12-31'],
    ['2027-07-02T03:59:59.999Z', '2027-07-01', '2028-12-31'],
    ['2027-07-02T04:00:00.000Z', '2027-07-02', '2028-12-31'],
    ['2027-01-01T02:59:59.999Z', '2026-12-31', '2027-12-31'],
    ['2027-01-01T03:00:00.000Z', '2027-01-01', '2028-12-31'],
  ]) assert.deepEqual(travelDateBounds(new Date(instant)), {min, max}, instant);
});

test('travel dates require real calendar days, inclusive bounds and an ordered range', () => {
  const now = new Date('2026-10-24T15:00:00Z');
  for (const [start, end] of [['2026-10-24', '2026-10-24'], ['2026-10-25', '2027-12-31'], ['2027-12-31', '2027-12-31']]) {
    assert.equal(travelDateError(start, end, now), null);
  }
  for (const invalid of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-11-00', '2026-11-1', '2026-11-01extra', '']) {
    assert.match(travelDateError(invalid, '2027-12-31', now), /fechas válidas/);
  }
  assert.equal(travelDateShapeError('2028-02-29', '2028-03-01'), null);
  assert.match(travelDateError('2026-10-25', '2026-10-24', now), /igual o posterior/);
  assert.match(travelDateError('2026-10-23', '2026-10-25', now), /desde hoy.*hora de Chile.*cambió el día/);
  assert.match(travelDateError('2027-12-31', '2028-01-01', now), /próximo año.*2027/);
});

test('public travel agenda omits expired or malformed trips without losing ongoing and upcoming visits', () => {
  const now = new Date('2026-10-24T15:00:00Z');
  const data = {travel_city: 'Santiago Centro', travel_start: '2026-10-24', travel_end: '2026-10-25', travel_note: 'Nota de viaje'};
  for (const dates of [
    {travel_start: '2026-10-23', travel_end: '2026-10-24'},
    {travel_start: '2026-10-24', travel_end: '2026-10-25'},
    {travel_start: '2027-04-01', travel_end: '2027-04-03'},
  ]) assert.deepEqual(currentTravelAgenda({...data, ...dates}, now), {city: data.travel_city, start: dates.travel_start, end: dates.travel_end, note: data.travel_note});
  for (const invalid of [
    {...data, travel_end: '2026-10-23'}, {...data, travel_city: '  '}, {...data, travel_start: ''},
    {...data, travel_start: '2026-02-31'}, {...data, travel_end: '2026-10-24bad'}, null, undefined,
  ]) assert.equal(currentTravelAgenda(invalid, now), null);
  const endsToday = {...data, travel_end: '2026-10-24'};
  assert.ok(currentTravelAgenda(endsToday, new Date('2026-10-25T02:59:59.999Z')));
  assert.equal(currentTravelAgenda(endsToday, new Date('2026-10-25T03:00:00.000Z')), null);
});

test('server parsing and writes reject stale/new trips while preserving stored trips during edits', async t => {
  t.mock.timers.enable({apis: ['Date'], now: new Date('2026-10-24T15:00:00Z')});
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
  globalThis.__travelPolicyDb = db;
  const hooks = registerHooks({resolve(specifier, context, next) {
    const stubs = {
      '@/db': 'export const getDb=async()=>globalThis.__travelPolicyDb;',
      '@/lib/admin-notifications': 'export const createAdminNotification=async()=>{};',
    };
    if (stubs[specifier]) return {url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true};
    if (specifier.startsWith('@/')) return {url: new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, shortCircuit: true};
    if (specifier.startsWith('./') && !/\.[a-z]+$/i.test(specifier)) return {url: new URL(specifier + '.ts', context.parentURL).href, shortCircuit: true};
    return next(specifier, context);
  }});
  try {
    const schema = await import('../db/schema.ts');
    for (const table of Object.values(schema)) {
      let config; try { config = getTableConfig(table); } catch { continue; }
      if (['collaboration_guards', 'review_reservations', 'settings_revision', 'private_profile_samples', 'private_sample_media'].includes(config.name)) continue;
      sqlite.exec(`CREATE TABLE IF NOT EXISTS "${config.name}" (${config.columns.filter(column => column.name !== 'revision').map(column => `"${column.name}" ${column.getSQLType()}${column.primary ? ' PRIMARY KEY' : ''}`).join(',')})`);
    }
    sqlite.exec(await readFile(new URL('../drizzle/0056_admin_collaboration.sql', import.meta.url), 'utf8'));
    sqlite.exec(await readFile(new URL('../drizzle/0062_private_profile_samples.sql', import.meta.url), 'utf8'));
    // Other tables use the current typed schema; apply the new sample DDL only.
    sqlite.exec((await readFile(new URL('../drizzle/0064_private_sample_workflow.sql', import.meta.url), 'utf8')).split('-- A confirmed migration')[0]);
    sqlite.exec("INSERT INTO users(id,email,role) VALUES('owner','qa@example.invalid','advertiser'),('new_owner','new@example.invalid','advertiser')");
    const {readProfileSubmission, updateProfile, createProfile, ProfileValidationError} = await import('../lib/profile-submission.ts');
    const base = {
      type: 'escort', tier: 'vip', display_name: 'Prueba de agenda', region: 'Región del Biobío', city: 'Concepción',
      short_description: 'Prueba de fechas', description: 'Validación local de fechas y edición.',
      contact_whatsapp: '56911111111', gender: 'Femenino', age: '28', intent: 'submit',
      travel_city: 'Santiago Centro', travel_start: '2026-10-24', travel_end: '2026-10-25', travel_note: 'Visita temporal',
    };
    const form = (changes = {}) => {
      const data = new FormData();
      for (const [key, value] of Object.entries({...base, ...changes})) data.set(key, value);
      return data;
    };
    const stored = data => readProfileSubmission(data, {travelDateValidation: 'stored'});
    const state = id => ({
      profile: sqlite.prepare('SELECT * FROM profiles WHERE id=?').get(id),
      details: sqlite.prepare('SELECT * FROM profile_details WHERE profile_id=?').get(id),
    });
    let sequence = 0;
    const fixture = async changes => {
      const submission = stored(form(changes)), id = 'trip_' + ++sequence;
      await db.insert(schema.profiles).values({
        id, ownerId: 'owner', type: 'escort', status: 'approved', tier: submission.tier, slug: id, handle: id,
        displayName: submission.displayName, region: submission.region, city: submission.city, comuna: submission.comuna,
        shortDescription: submission.shortDescription, description: submission.description,
        contactWhatsapp: submission.contactWhatsapp, contactTelegram: null, verificationStatus: 'reviewed',
      });
      await db.insert(schema.profileDetails).values({profileId: id, ...submission.details});
      return id;
    };
    const edit = (id, data, options = {}) => updateProfile(id, 'owner', stored(data), {version: {key: 'profile:' + id, revision: state(id).profile.revision}, ...options});

    await t.test('all new submissions validate even drafts and ignore travel fields of other types', () => {
      for (const changes of [
        {travel_start: '2026-10-23'}, {travel_end: '2028-01-01'}, {travel_start: '2026-02-31'},
        {travel_start: '2026-10-24extra'}, {travel_city: ''}, {travel_end: ''},
      ]) assert.throws(() => readProfileSubmission(form({...changes, intent: 'draft'})), ProfileValidationError);
      for (const type of ['agency', 'rental']) {
        const submission = readProfileSubmission(form({type, travel_start: '1900-01-01', travel_end: '1900-01-02'}));
        assert.ok(!Object.keys(JSON.parse(submission.details.metadata)).some(key => key.startsWith('travel_')));
      }
      assert.ok(!JSON.parse(readProfileSubmission(form({content_only: 'on', travel_start: '1900-01-01'})).details.metadata).travel_city);
      assert.equal(JSON.parse(readProfileSubmission(form()).details.metadata).travel_start, '2026-10-24');
    });

    await t.test('stored expired and ongoing trips do not block contact or note edits', async () => {
      for (const dates of [
        {travel_start: '2026-09-01', travel_end: '2026-09-03'},
        {travel_start: '2026-10-23', travel_end: '2026-10-26'},
      ]) {
        const id = await fixture(dates);
        assert.deepEqual(await edit(id, form({...dates, contact_whatsapp: '56922222222'})), {updated: true, contactOnly: true});
        assert.equal(state(id).profile.status, 'approved');
        assert.equal(state(id).profile.verification_status, 'reviewed');
        assert.equal(JSON.parse(state(id).details.metadata).travel_start, dates.travel_start);
        assert.equal((await edit(id, form({...dates, contact_whatsapp: '56922222222', travel_note: 'Nota actualizada'}))).updated, true);
      }
    });

    await t.test('an expired trip cannot be moved or extended without current valid dates, even by admin', async () => {
      const dates = {travel_start: '2026-09-01', travel_end: '2026-09-03'};
      const id = await fixture(dates), before = state(id);
      for (const change of [{travel_city: 'Valparaíso'}, {travel_end: '2026-09-04'}]) {
        for (const adminEditor of [false, true]) {
          await assert.rejects(edit(id, form({...dates, ...change}), {adminEditor}), /desde hoy/);
          assert.deepEqual(state(id), before);
        }
      }
      assert.equal((await edit(id, form({travel_city: '', travel_start: '', travel_end: '', travel_note: ''}))).updated, true);
      assert.equal(JSON.parse(state(id).details.metadata).travel_city, undefined);
    });

    await t.test('stored private samples remain readable and editable but cannot publish an expired trip', async () => {
      const {sampleFormJson} = await import('../lib/private-sample-policy.ts');
      const {sampleInitial, createPrivateSample, updatePrivateSample, migratePrivateSample, getPrivateSample} = await import('../lib/private-samples.ts');
      const dates = {travel_start: '2026-09-01', travel_end: '2026-09-03'};
      const id = 'sam_' + crypto.randomUUID(), admin = {id: 'owner',accessLevel:'owner',email:'qa@example.invalid',displayName:'QA',githubLogin:'qa'};
      const row = {id, formJson: sampleFormJson(form(dates)), migratedAt: null};
      assert.equal(sampleInitial(row).details.metadata.travel_start, dates.travel_start);
      const createForm = form(dates); createForm.set('sample_permission', 'on');
      await assert.rejects(createPrivateSample(createForm, admin), /desde hoy/);
      await db.insert(schema.privateProfileSamples).values({...row, displayName: base.display_name, createdBy: 'owner', expiresAt: Date.now() + 86400000});
      const version = revision => ({key: 'sample:' + id, revision});
      const sample = () => sqlite.prepare('SELECT * FROM private_profile_samples WHERE id=?').get(id);
      await updatePrivateSample(id, form({...dates, travel_note: 'Nota nueva'}), version(sample().revision), admin);
      assert.equal(new Map(JSON.parse(sample().form_json)).get('travel_note'), 'Nota nueva');
      const before = sample();
      await assert.rejects(updatePrivateSample(id, form({...dates, travel_end: '2026-09-04'}), version(before.revision), admin), /desde hoy/);
      await assert.rejects(updatePrivateSample(id, form({...dates, travel_note: 'Sobrescritura antigua'}), version(before.revision - 1), admin), /información cambió/);
      assert.deepEqual(sample(), before);
      sqlite.exec("UPDATE users SET is_active=1,email_verified_at='2026-10-01T00:00:00Z' WHERE id='new_owner'");
      await assert.rejects(migratePrivateSample(await getPrivateSample(id), 'new@example.invalid', version(before.revision), admin), /desde hoy/);
      assert.equal(sqlite.prepare("SELECT count(*) n FROM profiles WHERE owner_id='new_owner'").get().n, 0);
    });

    await t.test('Chile midnight after form parsing rejects both creation and new trip edits without partial writes', async () => {
      t.mock.timers.setTime(new Date('2026-10-25T02:59:59Z').getTime());
      const submission = readProfileSubmission(form());
      const id = await fixture({travel_city: '', travel_start: '', travel_end: '', travel_note: ''}), before = state(id);
      t.mock.timers.setTime(new Date('2026-10-25T03:00:01Z').getTime());
      await assert.rejects(createProfile('new_owner', submission), /cambió el día/);
      assert.equal(sqlite.prepare("SELECT count(*) n FROM profiles WHERE owner_id='new_owner'").get().n, 0);
      await assert.rejects(updateProfile(id, 'owner', submission), /cambió el día/);
      assert.deepEqual(state(id), before);
      assert.throws(() => readProfileSubmission(form()), /cambió el día/);
      assert.equal(JSON.parse(readProfileSubmission(form({travel_start: '2026-10-25'})).details.metadata).travel_start, '2026-10-25');
    });
  } finally {
    hooks.deregister(); sqlite.close(); delete globalThis.__travelPolicyDb;
  }
});
