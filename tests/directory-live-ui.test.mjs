import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { activeStories, chronologicalStories, storyTimestamp } from '../lib/story-order.ts';
const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('story dates use UTC and chronological order across historical/ISO timestamps', () => {
  assert.equal(storyTimestamp('2026-10-08 04:00:00'), Date.parse('2026-10-08T04:00:00Z'));
  assert.deepEqual(chronologicalStories([{id:'b',createdAt:'2026-10-08T04:00:00Z'}, {id:'a',createdAt:'2026-10-08 02:00:00'}]).map(x => x.id), ['a','b']);
  assert.deepEqual(activeStories([{expiresAt:'2026-10-08T04:00:00Z'}, {expiresAt:'2026-10-08T05:00:00Z'}], Date.parse('2026-10-08T04:00:00Z')), [{expiresAt:'2026-10-08T05:00:00Z'}]);
});
test('quick and advanced filters share one form inside the same expandable body', async () => {
  const code = await source('app/directorio/DirectoryFilters.tsx');
  assert.equal((code.match(/<form /g) ?? []).length, 1);
  assert.ok(code.indexOf('id="directory-filter-controls"') < code.indexOf('className="directory-quick-filters"'));
  assert.ok(code.indexOf('className="directory-quick-filters"') < code.indexOf('className="filter-more-options"'));
  assert.equal((code.match(/type="submit"/g) ?? []).length, 1);
  assert.match(code, /params.delete\(key\)/);
  assert.match(code, /is-online/); assert.match(code, /is-verified/);
});
test('stories follow displayed listing IDs and viewers in all catalogues', async () => {
  for (const path of ['app/escorts/page.tsx', 'app/escorts/[citySlug]/page.tsx', 'app/agencias/page.tsx', 'app/arriendos/page.tsx']) {
    const code = await source(path);
    assert.match(code, /getActiveStories\(\{ viewerId: viewer\?\.id, profileIds: profiles.map/);
    assert.match(code, /<DirectoryStoryLayout/);
  }
  assert.match(await source('lib/stories.ts'), /eq\(profileMedia.visibility, "public"\)/);
});
test('story upload atomically limits five per type and protects publication visibility and R2 margin', async () => {
  const code = await source('app/api/historias/route.ts');
  assert.match(code, /owner_hidden_at IS NULL/);
  assert.match(code, /SELECT count\(\*\) FROM profile_statuses/);
  assert.match(code, /usage.bytes \+ imageData.byteLength > MEDIA_HARD_LIMIT_BYTES/);
  assert.match(code, /inserted.meta.changes/);
  assert.ok(code.indexOf('if (!profile)') < code.indexOf('await purgeExpiredImageStories'));
});
test('admin pending badges scope both public and exclusive files to the selected publication', async () => {
  const code = await source('app/admin/medios/page.tsx');
  const counts = code.slice(code.indexOf('const [pendingPublicRows'), code.indexOf('const [pendingPublicRows') + 1600);
  assert.match(counts, /eq\(profileMedia.profileId, selectedProfileId\)/);
  assert.match(counts, /eq\(exclusiveContentCollections.profileId, selectedProfileId\)/);
  assert.match(code, /TOTAL DEL SITIO/);
  assert.match(code, /archivos pendientes/);
  assert.match(code, /name="perfil" type="hidden" value=\{selectedProfileId\}/);
  assert.match(code, /name="cuenta" type="hidden" value=\{selectedOwnerId\}/);
  assert.match(code, /href=\{mediaHref\(clearParams\)\}/);
});
test('all-days is a non-submit toggle that does not overwrite stored hour inputs', async () => {
  const code = await source('app/mi-cuenta/ProfileForm.tsx');
  assert.match(code, /availability-toggle-all" type="button"/);
  assert.match(code, /current.size === availabilityDays.length \? new Set\(\) : new Set/);
  assert.match(code, /value=\{availabilityHours\[day.key\]\.opens/);
  const sections = await source('app/directorio/_components.tsx');
  assert.ok(sections.indexOf('id: "masajes"') < sections.indexOf('id: "agency"'));
});
