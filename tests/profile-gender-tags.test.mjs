import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {incompatibleProfileTags, profileTagsForGender} from '../lib/profile-tag-policy.ts';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('Escort Hombres is derived from gender for every submitted tag combination', () => {
  const tags = ['milf', 'hombres', 'trans', 'masajes', 'venta-contenido'];
  for (const gender of ['', 'Femenino', 'Masculino', 'No binario', 'Trans']) {
    for (let mask = 0; mask < 2 ** tags.length; mask++) {
      const selected = Object.freeze(tags.filter((_, index) => mask & (1 << index)));
      const normalized = profileTagsForGender(selected, gender);
      assert.equal(normalized.includes('hombres'), gender === 'Masculino', `${gender}/${mask}`);
      assert.deepEqual(normalized.filter(tag => tag !== 'hombres'), selected.filter(tag => tag !== 'hombres'));
      assert.equal(normalized.length, new Set(normalized).size);
      assert.deepEqual(profileTagsForGender(normalized, gender), normalized);
    }
  }
});

test('editing old listings removes stale Hombres and follows gender changes without losing other tags', () => {
  assert.deepEqual(profileTagsForGender(['masajes'], 'Masculino'), ['masajes', 'hombres']);
  assert.deepEqual(profileTagsForGender(['masajes', 'hombres', 'hombres'], 'Femenino'), ['masajes']);
  const initial = ['trans', 'venta-contenido'];
  const masculine = profileTagsForGender(initial, 'Masculino');
  assert.deepEqual(masculine, [...initial, 'hombres']);
  for (const gender of ['Femenino', 'No binario', 'Trans', '']) {
    assert.deepEqual(profileTagsForGender(masculine, gender), initial);
  }
  assert.deepEqual(profileTagsForGender(profileTagsForGender(masculine, 'Trans'), 'Masculino'), masculine);
});

test('automatic Hombres preserves the existing MILF database compatibility policy', () => {
  assert.equal(incompatibleProfileTags(profileTagsForGender(['milf'], 'Masculino')), true);
  assert.equal(incompatibleProfileTags(profileTagsForGender(['milf', 'hombres'], 'Femenino')), false);
  assert.equal(incompatibleProfileTags(profileTagsForGender(['milf', 'trans'], 'Femenino')), true);
  assert.equal(incompatibleProfileTags(profileTagsForGender(['trans'], 'Masculino')), false);
});

test('creation, editing, admin and private samples all use server-derived tags before compatibility checks', async () => {
  const server = await source('lib/profile-submission.ts');
  assert.match(server, /const tags = typeValue === "escort"\s*\? profileTagsForGender\([\s\S]*?, gender\)\s*: \[\]/);
  assert.ok(server.indexOf('profileTagsForGender(listFromForm') < server.indexOf('if (incompatibleProfileTags(tags))'));
  for (const path of [
    'app/api/perfiles/nuevo/route.ts',
    'app/api/perfiles/[profileId]/route.ts',
    'app/api/admin/cuentas/[userId]/perfiles/route.ts',
    'app/api/admin/profiles/[profileId]/editar/route.ts',
    'lib/private-samples.ts',
  ]) assert.match(await source(path), /readProfileSubmission\(/, path);
});
