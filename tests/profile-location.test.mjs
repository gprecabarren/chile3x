import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { formatCompactRegionName, getCityReferenceMap, regions } from '../app/locations.ts';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('compact regions use the requested Roman numeral then lowercase región for all 16 regions', () => {
  for (const region of regions) assert.equal(formatCompactRegionName(region.title), `${region.numeral} región`);
  assert.equal(formatCompactRegionName('Región del Biobío'), 'VIII región');
  assert.equal(formatCompactRegionName('Unknown region'), 'Unknown region');
});

test('reference maps use city-level context only, safely encode labels, and need no API key', () => {
  const { embedUrl, mapsUrl } = getCityReferenceMap('Concepción', 'Región del Biobío');
  const embed = new URL(embedUrl), link = new URL(mapsUrl);
  assert.equal(embed.origin, 'https://maps.google.com');
  assert.equal(embed.searchParams.get('q'), 'Concepción, Región del Biobío, Chile');
  assert.equal(embed.searchParams.get('output'), 'embed');
  assert.equal(embed.searchParams.get('hl'), 'es');
  assert.equal(link.searchParams.get('api'), '1');
  assert.equal(link.searchParams.get('query'), embed.searchParams.get('q'));
  assert.ok(!embed.searchParams.has('key')); assert.ok(!link.searchParams.has('key'));
  const encoded = new URL(getCityReferenceMap('A&B #1', "O'Higgins").embedUrl);
  assert.equal(encoded.searchParams.get('q'), "A&B #1, O'Higgins, Chile");
});

test('all listing types share a lazy, accessible, wide map while preserving city SEO links and private notes', async () => {
  const page = await source('app/perfil/[slug]/page.tsx'), card = await source('app/perfil/ProfileLocationCard.tsx');
  assert.match(page, /<ProfileLocationCard city=\{profile.city\} region=\{profile.region\}/);
  assert.match(card, /<h2>\{city\}, <span>\{formatCompactRegionName\(region\)\}/);
  assert.match(card, /getCityReferenceMap\(city, region\)/);
  assert.doesNotMatch(card, /getCityReferenceMap\([^)]*referenceLocation/);
  assert.match(card, /loading="lazy" referrerPolicy="no-referrer"/);
  assert.match(card, /title=\{`Mapa referencial/);
  assert.match(card, /href=\{getCityPath\(city\)\}>Ver más en \{city\}/);
  const css = await source('app/globals.css');
  assert.match(css, /\.profile-location-map\s*\{[^}]*width: 100%;[^}]*aspect-ratio: 2 \/ 1;[^}]*min-height: 150px;[^}]*max-height: 210px/);
  assert.doesNotMatch(card, /href=\{mapsUrl\}|Abrir mapa referencial/);
  assert.doesNotMatch(css, /\.profile-location-map-heading\s+a/);
});
