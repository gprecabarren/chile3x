import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/d1';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { multipartBodyLimit, limitMultipartUpload } from '../worker/upload-limits.ts';
import { BufferTarget, EncodedPacket, EncodedVideoPacketSource, Output, WebMOutputFormat } from 'mediabunny';

const source = file => readFile(new URL('../' + file, import.meta.url), 'utf8');
const png = () => new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64')], 'final.png', { type: 'image/png' });
const options = { watermark: true, blur: true, faceRegions: [{ x: .1, y: .1, width: .3, height: .4 }] };


// Minimal real-container fixture verifies track/codec/duration metadata only;
// decoded playback and client watermark rendering use the shared video tests.
async function preparedWebm(duration) {
  const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
  const track = new EncodedVideoPacketSource('vp8'); output.addVideoTrack(track, {frameRate:1});
  await output.start();
  for (let second = 0; second < duration; second++) await track.add(new EncodedPacket(new Uint8Array([0x10,0,0,0x9d,0x01,0x2a,0x40,0x01,0xf0,0]), 'key', second, 1), { decoderConfig: {codec:'vp8',codedWidth:320,codedHeight:240} });
  track.close(); await output.finalize();
  return new File([output.target.buffer], 'prepared.webm', {type:'video/webm'});
}

test('private sample media shares the listing pipeline with transactional revisions and private storage', async t => {
  const sqlite = new DatabaseSync(':memory:'), objects = new Map(), audit = [];
  let afterPut, failPut = false, failDelete = false, loseCommitResponse = false;
  const prepare = (query, args = []) => ({
    query, bind: (...values) => prepare(query, values),
    execute() { const statement = sqlite.prepare(query); if (statement.columns().length) return { results: statement.all(...args) }; const result = statement.run(...args); return { results: [], meta: { changes: Number(result.changes) } }; },
    async all() { return this.execute(); }, async run() { return this.execute(); },
    async raw() { const statement = sqlite.prepare(query); statement.setReturnArrays(true); return statement.all(...args); },
  });
  globalThis.__sampleMediaDb = drizzle({ prepare, async batch(statements) {
    sqlite.exec('BEGIN'); let values;
    try { values = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    if (loseCommitResponse && statements.some(statement => statement.query?.includes('insert into "collaboration_guards"'))) { loseCommitResponse = false; throw Error('response lost after COMMIT'); }
    return values;
  } });
  globalThis.__sampleMediaAdmin = { id: 'admin', githubLogin: 'local_fixture', email: 'admin@example.invalid', displayName: 'Local fixture', samplePermission: true };
  globalThis.__sampleMediaAudit = (_actor, value) => { audit.push(value); return true; };
  globalThis.__sampleMediaBucket = {
    async put(key, body, metadata) { const bytes = new Uint8Array(await new Response(body).arrayBuffer()); objects.set(key, { bytes, ...metadata }); if (afterPut) { const hook = afterPut; afterPut = undefined; await hook(); } if (failPut) throw Error('R2 response lost'); },
    async head(key) { const value = objects.get(key); return value ? { size: value.bytes.length, customMetadata: value.customMetadata } : null; },
    async get(key) { const value = objects.get(key); return value ? { body: new Blob([value.bytes]).stream(), size: value.bytes.length, customMetadata: value.customMetadata } : null; },
    async delete(key) { if (failDelete) throw Error('R2 unavailable'); objects.delete(key); },
  };
  const hooks = registerHooks({ resolve(specifier, context, next) {
    const stubs = {
      '@/db': 'export const getDb=async()=>globalThis.__sampleMediaDb;',
      '@/lib/auth': 'export const getCurrentAdmin=async()=>globalThis.__sampleMediaAdmin;export const assertSameOrigin=request=>{if(request.headers.get("origin")!==new URL(request.url).origin)throw Error("origin");};',
      '@/lib/private-samples': 'export const canManageSamples=admin=>admin.samplePermission===true;',
      '@/lib/admin-audit': 'export const recordAdminAudit=async(actor,input)=>globalThis.__sampleMediaAudit(actor,input);',
      'cloudflare:workers': 'export const env={get MEDIA(){return globalThis.__sampleMediaBucket;}};',
    };
    if (stubs[specifier]) return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: new URL('../' + specifier.slice(2) + '.ts', import.meta.url).href, shortCircuit: true };
    try { return next(specifier, context); }
    catch (error) { if (/^\.{1,2}\//.test(specifier) && context.parentURL?.startsWith('file:') && !/\.[mc]?[jt]s$/.test(specifier)) return next(specifier + '.ts', context); throw error; }
  } });
  try {
    const schema = await import('../db/schema.ts');
    const skip = new Set(['private_profile_samples', 'private_sample_media', 'collaboration_guards', 'review_reservations', 'settings_revision', 'admin_mutation_receipts']);
    for (const table of Object.values(schema)) {
      let config; try { config = getTableConfig(table); } catch { continue; }
      if (skip.has(config.name)) continue;
      const columns = config.columns.filter(column => column.name !== 'revision' && column.name !== 'admin_escort_limit_override');
      sqlite.exec(`CREATE TABLE IF NOT EXISTS "${config.name}" (${columns.map(column => `"${column.name}" ${column.getSQLType()}${column.primary ? ' PRIMARY KEY' : ''}${config.name === 'data_deletion_jobs' && column.name === 'r2_key' ? ' UNIQUE' : ''}`).join(',')})`);
    }
    for (const file of ['0056_admin_collaboration.sql', '0059_reversible_photo_edits_and_mutation_receipts.sql', '0062_private_profile_samples.sql', '0064_private_sample_workflow.sql']) sqlite.exec(await source('drizzle/' + file));
    sqlite.exec("INSERT INTO users(id,email,role) VALUES('admin','admin@example.invalid','admin'),('other_admin','other@example.invalid','admin');");
    const lib = await import('../lib/private-sample-media.ts'), { CollaborationConflict } = await import('../lib/collaboration.ts');
    const collection = await import('../app/api/admin/muestras/[sampleId]/media/route.ts');
    const item = await import('../app/api/admin/muestras/[sampleId]/media/[mediaId]/route.ts');
    const editor = await import('../app/api/admin/muestras/[sampleId]/media/[mediaId]/procesar/route.ts');
    const makeSample = id => sqlite.prepare("INSERT INTO private_profile_samples(id,handle,display_name,form_json,expires_at,created_by) VALUES(?,?,?,'[]',?,'admin')").run(id, id, 'Local fixture', Date.now() + 100000);
    const revision = id => sqlite.prepare('SELECT revision FROM private_profile_samples WHERE id=?').get(id).revision;
    const version = id => ({ key: `sample:${id}`, revision: revision(id), mutationId: crypto.randomUUID() });
    const rows = id => sqlite.prepare('SELECT * FROM private_sample_media WHERE sample_id=? ORDER BY sort_order,id').all(id);
    const upload = (id, extra = {}) => lib.uploadSampleMedia({ sampleId: id, file: png(), uploadKind: 'gallery', actorId: 'admin', version: version(id), processing: options, ...extra });
    const formFor = (id, extra = {}) => { const form = new FormData(), snapshot = version(id); form.set('review_key', snapshot.key); form.set('review_revision', String(snapshot.revision)); form.set('mutation_id', snapshot.mutationId); for (const [key, value] of Object.entries(extra)) form.set(key, value); return form; };
    const request = (id, method, body, origin = 'https://example.invalid') => new Request(`https://example.invalid/api/admin/muestras/${id}/media`, { method, ...(body ? { body } : {}), headers: { origin } });
    const params = (sampleId, mediaId) => ({ params: Promise.resolve({ sampleId, ...(mediaId ? { mediaId } : {}) }) });
    makeSample('main'); makeSample('other');

    await t.test('route authentication and origin are checked before parsing uploads; all responses stay noindex and no-store', async () => {
      const admin = globalThis.__sampleMediaAdmin;
      globalThis.__sampleMediaAdmin = null;
      let response = await collection.POST(request('main', 'POST', new FormData()), params('main'));
      assert.equal(response.status, 401); assert.match(response.headers.get('cache-control'), /private, no-store/); assert.match(response.headers.get('x-robots-tag'), /noindex/);
      globalThis.__sampleMediaAdmin = { ...admin, samplePermission: false };
      assert.equal((await collection.POST(request('main', 'POST', new FormData()), params('main'))).status, 403);
      globalThis.__sampleMediaAdmin = admin;
      assert.equal((await collection.POST(request('main', 'POST', new FormData(), 'https://untrusted.invalid'), params('main'))).status, 403);
      assert.equal(objects.size, 0);
    });

    await t.test('Worker upload bounds allow the new media routes before parsing, while edits keep their 10 MB bound', async () => {
      assert.equal(multipartBodyLimit('/api/admin/muestras/main/media'), 12_256_000);
      assert.equal(multipartBodyLimit('/api/admin/muestras/main/media/file/procesar'), 10_256_000);
      const body = new FormData(); body.set('file', new File([new Uint8Array(1_100_000)], 'final.png'));
      const request = new Request('https://example.invalid/api/admin/muestras/main/media', {method:'POST',body});
      assert.ok(await limitMultipartUpload(request) instanceof Request);
      const tooLarge = new Request('https://example.invalid/api/admin/muestras/main/media/file/procesar', { method: 'POST', headers: { 'content-type':'multipart/form-data; boundary=fixture', 'content-length':'10256001' }, body: 'x' });
      assert.equal((await limitMultipartUpload(tooLarge)).status, 413);
    });

    await t.test('prepared photo upload stores only its final bytes and options, no approval, exact actual revision, receipt and audit', async () => {
      const form = formFor('main', { file: png(), processing: JSON.stringify(options) }), mutationId = form.get('mutation_id');
      const response = await collection.POST(request('main', 'POST', form), params('main'));
      assert.equal(response.status, 201); const payload = await response.json();
      assert.equal(payload.revision, revision('main')); assert.equal(payload.revision, 1);
      assert.equal(payload.media.moderationStatus, 'approved'); assert.equal(payload.media.visibility, 'public');
      const [file] = rows('main'); assert.match(file.r2_key, /^private-samples\/main\//); assert.equal(objects.size, 1);
      assert.equal(objects.get(file.r2_key).httpMetadata.cacheControl, 'private, no-store'); assert.deepEqual(JSON.parse(objects.get(file.r2_key).customMetadata.photoOptions), options);
      assert.equal(sqlite.prepare('SELECT resource_key FROM admin_mutation_receipts WHERE id=?').get(mutationId).resource_key, 'sample:main');
      assert.equal(audit.at(-1).action, 'sample.upload'); assert.doesNotMatch(JSON.stringify(payload), /r2_key|uploadedBy|token|original/);
      const state = await lib.samplePhotoState('main', file.id); assert.equal(state.lockedWatermark, true); assert.equal(state.lockedBlur, true); assert.equal(state.hasBase, false);
      assert.deepEqual(Buffer.from(await new Response((await lib.samplePhotoSource('main', file.id)).body).arrayBuffer()), Buffer.from(await png().arrayBuffer()));
    });

    await t.test('cross-sample reads, edits, cover changes and removals cannot touch another sample', async () => {
      const file = rows('main')[0];
      for (const action of [() => lib.samplePhotoSource('other', file.id), () => lib.samplePhotoState('other', file.id), () => lib.removeSampleMedia('other', file.id, version('other'), 'admin'), () => lib.setSampleCover('other', file.id, version('other'), 'admin'), () => lib.processSamplePhoto({ sampleId: 'other', mediaId: file.id, file: png(), options, version: version('other'), actorId: 'admin' })]) await assert.rejects(action, lib.SampleMediaError);
      assert.equal(rows('main').length, 1); assert.equal(rows('other').length, 0);
    });

    await t.test('malformed processing, additional originals and stale multipart requests never create another object', async () => {
      const count = objects.size;
      for (const extra of [{processing:'{}'},{processing:JSON.stringify(options),original_file:png()}]) {
        const response = await collection.POST(request('main','POST',formFor('main',{file:png(),...extra})),params('main'));
        assert.equal(response.status,400);
      }
      const stale = formFor('main',{file:png()}); await upload('main');
      assert.equal((await collection.POST(request('main','POST',stale),params('main'))).status,409);
      assert.equal(objects.size,count+1);
    });

    await t.test('prepared videos use the same track and duration validation, three-video quota, and private storage', async () => {
      makeSample('videos'); const accepted = await preparedWebm(15);
      await assert.rejects(upload('videos',{file:await preparedWebm(16)}),/15 segundos/);
      await assert.rejects(upload('videos',{file:accepted,uploadKind:'profile_photo'}),/debe ser una imagen/);
      for (let i=0;i<3;i++) {const saved = await upload('videos',{file:accepted}); assert.equal(saved.media.mediaType,'video'); assert.equal(saved.media.contentType,'video/webm');}
      await assert.rejects(upload('videos',{file:accepted}),/3 videos/); assert.equal(rows('videos').length,3);
    });

    await t.test('new cover preserves the old photo in the gallery and returns the trigger-derived revision', async () => {
      const first = await upload('main', { uploadKind: 'profile_photo' }), oldKey = rows('main').find(file => file.id === first.media.id).r2_key;
      const before = revision('main'), second = await upload('main', { uploadKind: 'profile_photo' });
      assert.equal(second.revision, before + 2); assert.equal(rows('main').find(file => file.id === first.media.id).is_profile_photo, 0);
      assert.equal(rows('main').filter(file => file.is_profile_photo).length, 1); assert.equal(objects.has(oldKey), true); assert.equal(sqlite.prepare('SELECT count(*) n FROM data_deletion_jobs').get().n, 0);
    });

    await t.test('reorder validates the complete set; cover and order modifications each invalidate old reviews and log changes', async () => {
      await upload('main'); const files = rows('main'), before = revision('main'), order = files.map(file => file.id).reverse();
      await assert.rejects(lib.reorderSampleMedia('main', [order[0], order[0]], version('main'), 'admin'), lib.SampleMediaError);
      const response = await collection.PATCH(request('main', 'PATCH', formFor('main', { order: JSON.stringify(order) })), params('main'));
      assert.equal(response.status, 200); assert.deepEqual(rows('main').map(file => file.id), order); assert.equal((await response.json()).revision, before + files.length); assert.equal(audit.at(-1).action, 'sample.reorder_media');
      const stale = version('main'), chosen = rows('main').find(file => !file.is_profile_photo);
      const changed = await item.PATCH(request('main', 'PATCH', formFor('main')), params('main', chosen.id));
      assert.equal(changed.status, 200); assert.equal((await changed.json()).revision, revision('main')); assert.equal(rows('main').find(file => file.is_profile_photo).id, chosen.id); assert.equal(audit.at(-1).action, 'sample.cover');
      await assert.rejects(lib.removeSampleMedia('main', chosen.id, stale, 'admin'), CollaborationConflict);
    });

    await t.test('typed sample ordering keeps cover and other formats in place and rejects incomplete or stale galleries', async () => {
      makeSample('typed_order');
      await upload('typed_order',{uploadKind:'profile_photo'});await upload('typed_order');await upload('typed_order');
      for(let i=0;i<2;i++)await upload('typed_order',{file:await preparedWebm(1)});
      const before=rows('typed_order'),cover=before.find(x=>x.is_profile_photo),photos=before.filter(x=>x.media_type==='image'&&!x.is_profile_photo).map(x=>x.id).reverse(),videos=before.filter(x=>x.media_type==='video').map(x=>x.id);
      const oldVersion=version('typed_order');
      let response=await collection.PATCH(request('typed_order','PATCH',formFor('typed_order',{kind:'image',order:JSON.stringify(photos)})),params('typed_order'));
      assert.equal(response.status,200);assert.deepEqual(rows('typed_order').filter(x=>x.media_type==='image'&&!x.is_profile_photo).map(x=>x.id),photos);assert.deepEqual(rows('typed_order').filter(x=>x.media_type==='video').map(x=>x.id),videos);assert.equal(rows('typed_order').find(x=>x.is_profile_photo).id,cover.id);
      response=await collection.PATCH(request('typed_order','PATCH',formFor('typed_order',{kind:'video',order:JSON.stringify([...videos].reverse())})),params('typed_order'));assert.equal(response.status,200);assert.deepEqual(rows('typed_order').filter(x=>x.media_type==='video').map(x=>x.id),[...videos].reverse());
      for(const order of [[cover.id,...photos],[photos[0]],['foreign',photos[1]],[photos[0],photos[0]]])assert.equal((await collection.PATCH(request('typed_order','PATCH',formFor('typed_order',{kind:'image',order:JSON.stringify(order)})),params('typed_order'))).status,400);
      await assert.rejects(lib.reorderSampleMedia('typed_order',photos,oldVersion,'admin','image'),CollaborationConflict);assert.equal(audit.at(-1).action,'sample.reorder_media');
    });

    await t.test('photo editing retains one final image, metadata and private source; failed deletion is durably queued', async () => {
      const file = rows('main')[0], previous = file.r2_key, before = revision('main'); failDelete = true;
      const response = await editor.POST(request('main', 'POST', formFor('main', { file: png(), options: JSON.stringify(options) })), params('main', file.id));
      failDelete = false; assert.equal(response.status, 200); assert.equal((await response.json()).revision, before + 1);
      const edited = rows('main').find(row => row.id === file.id); assert.notEqual(edited.r2_key, previous); assert.ok(objects.has(edited.r2_key));
      assert.equal(sqlite.prepare('SELECT r2_key FROM data_deletion_jobs WHERE r2_key=?').get(previous).r2_key, previous); assert.equal(audit.at(-1).action, 'sample.process_photo');
      const sourceResponse = await editor.GET(new Request('https://example.invalid/editor?source=1'), params('main', file.id)); assert.equal(sourceResponse.status, 200); assert.equal(sourceResponse.headers.get('cross-origin-resource-policy'), 'same-origin');
    });

    await t.test('stale or reserved uploads roll back completely and clean only their new object', async () => {
      const stale = version('main'); await upload('main'); const count = objects.size, existing = rows('main').map(file => file.r2_key);
      await assert.rejects(upload('main', { version: stale }), CollaborationConflict); assert.equal(objects.size, count);
      sqlite.prepare('INSERT INTO review_reservations VALUES(?,?,?,?)').run('sample:main', 'other_admin', 'lease', Date.now() + 10000);
      await assert.rejects(upload('main'), CollaborationConflict); assert.equal(objects.size, count); for (const key of existing) assert.ok(objects.has(key));
      sqlite.exec('DELETE FROM review_reservations'); assert.equal(sqlite.prepare('SELECT count(*) n FROM collaboration_guards').get().n, 0);
    });

    await t.test('expiry during R2 upload is checked in the write transaction even if the revision did not change', async () => {
      makeSample('expires'); const now = Date.now; let clock = now();
      Date.now = () => clock;
      try { afterPut = () => { clock += 100001; }; await assert.rejects(upload('expires'), CollaborationConflict); assert.equal(rows('expires').length, 0); assert.equal([...objects.keys()].filter(key => key.startsWith('private-samples/expires/')).length, 0); }
      finally { Date.now = now; }
      for (const [id, statement] of [['trash', 'trashed_at=1'], ['migrated', "migrated_at='done'"]]) { makeSample(id); sqlite.exec(`UPDATE private_profile_samples SET ${statement} WHERE id='${id}'`); await assert.rejects(upload(id), error => error.status === 409); }
    });

    await t.test('a lost R2 acknowledgement removes only an uncommitted object and leaves saved images intact', async () => {
      const saved = rows('main').map(file => file.r2_key), count = objects.size; failPut = true;
      try { await assert.rejects(upload('main'), /R2 response lost/); } finally { failPut = false; }
      assert.equal(objects.size, count); for (const key of saved) assert.ok(objects.has(key));
    });

    await t.test('uncommitted object cleanup survives an R2 outage through a durable deletion job', async () => {
      makeSample('orphan'); sqlite.prepare('INSERT INTO review_reservations VALUES(?,?,?,?)').run('sample:orphan','other_admin','lease',Date.now()+10000);
      failDelete=true;
      try { await assert.rejects(upload('orphan'),CollaborationConflict); }
      finally { failDelete=false;sqlite.exec("DELETE FROM review_reservations WHERE resource_key='sample:orphan'"); }
      const [key]=[...objects.keys()].filter(key=>key.startsWith('private-samples/orphan/'));
      assert.ok(key);assert.ok(sqlite.prepare('SELECT r2_key FROM data_deletion_jobs WHERE r2_key=?').get(key));assert.equal(rows('orphan').length,0);
    });

    await t.test('a lost D1 acknowledgement preserves a committed object and atomic mutation receipt', async () => {
      makeSample('uncertain'); loseCommitResponse = true; const snapshot = version('uncertain');
      await assert.rejects(upload('uncertain', { version: snapshot }), /response lost after COMMIT/);
      const [file] = rows('uncertain'); assert.ok(objects.has(file.r2_key)); assert.ok(sqlite.prepare('SELECT id FROM admin_mutation_receipts WHERE id=?').get(snapshot.mutationId));
      assert.equal(revision('uncertain'), 1);
    });

    await t.test('limits exclude the cover and enforce gallery count, source signatures, actual video validation and total bytes', async () => {
      makeSample('limits'); await upload('limits', { uploadKind: 'profile_photo' }); for (let i = 0; i < 10; i++) await upload('limits');
      await assert.rejects(upload('limits'), /10 fotos/); assert.equal(rows('limits').length, 11);
      await assert.rejects(upload('limits', { uploadKind: 'profile_photo' }), /principal anterior se conserva/); assert.equal(rows('limits').length, 11);
      const existing = rows('limits').find(file => !file.is_profile_photo); await lib.setSampleCover('limits', existing.id, version('limits'), 'admin'); assert.equal(rows('limits').find(file => file.is_profile_photo).id, existing.id);
      const fakeVideo = new File([new Uint8Array([0,0,0,16,102,116,121,112,105,115,111,109])], 'fake.mp4', { type: 'video/mp4' });
      await assert.rejects(upload('other', { file: fakeVideo }), lib.SampleMediaError); assert.equal(rows('other').length, 0);
      await assert.rejects(upload('other', { file: new File(['not an image'], 'fake.jpg', { type: 'image/jpeg' }) }), /Solo se permiten/);
      makeSample('size'); const big = await upload('size'); sqlite.prepare('UPDATE private_sample_media SET byte_size=? WHERE id=?').run(45_000_000, big.media.id);
      await assert.rejects(upload('size'), /45 MB/);
    });

    await t.test('removal is scoped and audited, returns actual revision and removes the reference before cleanup', async () => {
      const file = rows('main')[0], before = revision('main');
      const response = await item.DELETE(request('main', 'DELETE', formFor('main')), params('main', file.id));
      assert.equal(response.status, 200); assert.equal((await response.json()).revision, before + 1); assert.equal(rows('main').some(row => row.id === file.id), false); assert.equal(objects.has(file.r2_key), false); assert.equal(audit.at(-1).action, 'sample.remove_media');
    });
  } finally {
    hooks.deregister(); sqlite.close();
    for (const key of ['__sampleMediaDb', '__sampleMediaAdmin', '__sampleMediaAudit', '__sampleMediaBucket']) delete globalThis[key];
  }
});
