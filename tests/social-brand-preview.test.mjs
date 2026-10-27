import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { publicPageMetadata, socialCardImage, socialCardImageUrl } from '../lib/seo.ts';

test('shared social preview serves the original black brand image from a versioned public asset', async () => {
  assert.match(socialCardImageUrl, /^\/assets\/chile3x-share-black-\d{8}\.jpeg$/);
  const [image, original] = await Promise.all([
    readFile(new URL('../public' + socialCardImageUrl, import.meta.url)),
    readFile(new URL('../public/chile3x-logo-dark.jpeg', import.meta.url)),
  ]);
  assert.deepEqual(image, original, 'Keep the reviewed official logo and its black background unchanged.');
  assert.equal(image.readUInt16BE(0), 0xffd8);
  assert.equal(socialCardImage.width, 1025);
  assert.equal(socialCardImage.height, 576);
  const metadata = publicPageMetadata({ title: 'Página pública', description: 'Descripción.', path: '/contacto' });
  assert.equal(metadata.openGraph.images[0].url, socialCardImageUrl);
  assert.equal(metadata.twitter.images[0], socialCardImageUrl);
});

test('sample social metadata shows only the public brand while retaining private robots and no canonical', async () => {
  const source = await readFile(new URL('../app/muestra/[sampleId]/page.tsx', import.meta.url), 'utf8');
  const expression = source.match(/export const metadata:Metadata=([\s\S]+?);\r?\nexport default/);
  assert.ok(expression, 'Sample previews must keep generic, static metadata separate from private profile data.');
  const metadata = runInNewContext('(' + expression[1] + ')', { socialCardImage, socialCardImageUrl });
  assert.equal(metadata.robots.index, false);
  assert.equal(metadata.robots.follow, false);
  assert.equal(metadata.robots.noarchive, true);
  assert.equal(metadata.robots.nosnippet, true);
  assert.equal(metadata.alternates.canonical, null);
  assert.equal(metadata.openGraph.images[0].url, socialCardImageUrl);
  assert.equal(metadata.twitter.card, 'summary_large_image');
  assert.equal(metadata.twitter.images[0], socialCardImageUrl);
  assert.equal(metadata.openGraph.title, 'Muestra privada · Chile3X');
  assert.doesNotMatch(JSON.stringify(metadata), /\/muestra\/|\/media\/|archivo|token|@/);
});
