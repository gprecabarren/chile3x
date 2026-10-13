import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { profileDemographicsError } from '../lib/profile-demographics.ts';
import { profilePublicFacts } from '../lib/profile-public-facts.ts';
import { profileSeoTitle, profileSeoDescription } from '../lib/profile-seo-content.ts';
const source = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('escort submissions require a listed gender and an integer adult age, drafts can be incomplete', () => {
  assert.match(profileDemographicsError('escort', '', '', true), /género/);
  assert.match(profileDemographicsError('escort', 'Femenino', '', true), /edad/);
  for (const age of ['0', '17', '100', '1234', '28.5', '-28', 'hola']) {
    assert.match(profileDemographicsError('escort', 'Femenino', age, true), /18 y 99/);
    assert.match(profileDemographicsError('escort', 'Femenino', age, false), /18 y 99/);
  }
  for (const gender of ['Femenino', 'Masculino', 'No binario', 'Trans']) {
    for (const age of ['18', '28', '99']) assert.equal(profileDemographicsError('escort', gender, age, true), null);
  }
  assert.match(profileDemographicsError('escort', 'Inventado', '28', false), /género válido/);
  assert.equal(profileDemographicsError('escort', '', '', false), null);
  for (const type of ['agency', 'rental']) assert.equal(profileDemographicsError(type, '', '', true), null);
});

test('all subsets of public optional facts omit empty values, units and attributes of other listing types', () => {
  const byType = {
    escort: { age: '28', gender: 'Femenino', nationality: 'Chilena', languages: 'Español, Inglés', skin_color: 'Clara', hair_color: 'Negro', body_type: 'Delgada', bust_size: 'Medio', measurements: '90-60-90', height_cm: '165', weight_kg: '58' },
    agency: { agency_years: '0', website: 'https://example.com/', promotions: 'Consulta la agenda', contact_methods: 'WhatsApp' },
    rental: { room_type: 'individual', furnished: 'si', private_bathroom: 'no', exterior_window: 'si', room_size: '18', common_expenses: 'si', deposit: '0', minimum_rental: 'meses', immediate_available: 'si', wifi: 'si', utilities_included: 'no', kitchen: 'si', laundry: 'si' },
  };
  for (const [type, values] of Object.entries(byType)) {
    const keys = Object.keys(values);
    for (let mask = 0; mask < 2 ** keys.length; mask++) {
      const selected = Object.fromEntries(keys.filter((_, index) => mask & (1 << index)).map(key => [key, values[key]]));
      const facts = profilePublicFacts(type, { ...selected, artist_name: 'Never rendered', unknown: 'Ignore' });
      assert.equal(facts.length, Object.keys(selected).length, `${type}/${mask}`);
      assert.equal(new Set(facts.map(([label]) => label)).size, facts.length);
      assert.ok(facts.every(([label, value]) => label && value && !/undefined|null|Never rendered|Ignore/.test(value)));
    }
    assert.deepEqual(profilePublicFacts(type, Object.fromEntries(keys.map(key => [key, '  ']))), []);
  }
  assert.deepEqual(profilePublicFacts('rental', { age: '28', gender: 'Femenino', height_cm: '165', price_night: '100' }), []);
});

test('search titles and descriptions retain intent with no optional fields, any summary or location reference', () => {
  for (const [type, label] of [['escort', 'escort'], ['agency', 'agencia de escorts'], ['rental', 'arriendo para escorts']]) {
    for (const shortDescription of [undefined, null, '', '  ', 'Atención con agenda previa.', '  Atención\ncon   agenda previa. ', 'Información útil sobre el anuncio. '.repeat(20)]) {
      const profile = { type, displayName: 'Nora', city: 'Concepción', shortDescription };
      assert.equal(profileSeoTitle(profile), `Nora, ${label} en Concepción`);
      for (const region of ['', 'Región VIII del Biobío']) {
        const description = profileSeoDescription(profile, region);
        assert.ok(description.length <= 160);
        assert.ok(description.startsWith(`Nora: ${label} en Concepción`));
        assert.doesNotMatch(description, /undefined|null|, \./);
        assert.doesNotMatch(description, /\s{2}|\n/);
      }
    }
  }
});

test('shared forms and public routes preserve server validation, privacy and field-help spacing', async () => {
  const [submission, form, page, css] = await Promise.all(['lib/profile-submission.ts', 'app/mi-cuenta/ProfileForm.tsx', 'app/perfil/[slug]/page.tsx', 'app/globals.css'].map(source));
  assert.match(submission, /profileDemographicsError\(typeValue, gender, age, intent === "submit"\)/);
  assert.equal((form.match(/value="draft" formNoValidate/g) ?? []).length, 2);
  assert.match(page, /profilePublicFacts\(profile.type, profile.details.metadata\)/);
  assert.match(page, /facts.length > 0 && <section/);
  assert.match(page, /profile.isPublic && !profile.isDemo && <script/);
  assert.match(page, /alternates: \{ canonical: profilePublicPath\(profile\) \}/);
  assert.match(css, /\.profile-form \.profile-form-help \{ margin: 12px 0 0/);
  assert.match(css, /\.profile-form \.form-grid \{ align-items: start/);
});
