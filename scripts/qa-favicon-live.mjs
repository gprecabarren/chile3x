// Public, read-only checks. No account cookies or mutation endpoints.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const base = 'https://chile3x.cl';
const request = path => fetch(base + path, { redirect:'manual', signal:AbortSignal.timeout(20_000) });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pairs = [
  ['favicon-48.png', 'chile3x-favicon-48-20261020.png', 'image/png'],
  ['favicon-192.png', 'chile3x-favicon-192-20261020.png', 'image/png'],
  ['favicon-512.png', 'chile3x-favicon-512-20261020.png', 'image/png'],
  ['favicon.ico', 'chile3x-favicon-20261020.ico', 'image/x-icon'],
  ['apple-touch-icon.png', 'chile3x-apple-touch-20261020.png', 'image/png'],
];

for (const path of ['/', '/perfil/@lalita', '/admin/acceso-denegado']) {
  const response = await request(path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const links = html.match(/<link\b[^>]*>/g) ?? [];
  const icons = links.filter(link => /rel="(?:icon|shortcut icon|apple-touch-icon)"/.test(link));
  assert.ok(icons.length >= 5, path);
  for (const [, freshPath] of pairs) assert.ok(icons.some(link => link.includes('/' + freshPath)), path + ': ' + freshPath);
  assert.ok(links.some(link => link.includes('/site.webmanifest?v=20261020')));
  assert.ok(icons.every(link => !/arsmate|onlyfans/i.test(link)));
  console.log('PASS public icon metadata: ' + path);
}

for (const [oldPath, freshPath, mime] of pairs) {
  const expected = hash(await readFile(new URL('../public/' + oldPath, import.meta.url)));
  for (const path of [oldPath, freshPath]) {
    const response = await request('/' + path);
    assert.equal(response.status, 200, path);
    const actualMime = response.headers.get('content-type')?.split(';')[0];
    assert.ok(actualMime === mime || (mime === 'image/x-icon' && actualMime === 'image/vnd.microsoft.icon'), path + ': ' + actualMime);
    assert.equal(hash(Buffer.from(await response.arrayBuffer())), expected, path);
  }
  console.log('PASS original and refreshed brand icon: ' + freshPath);
}

const manifestResponse = await request('/site.webmanifest?v=20261020');
assert.equal(manifestResponse.status, 200);
const manifest = await manifestResponse.json();
assert.deepEqual(manifest.icons.map(icon => icon.src), [
  '/chile3x-favicon-192-20261020.png',
  '/chile3x-favicon-512-20261020.png',
]);
console.log('PASS manifest brand icon paths.');
