import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const bytes = path => readFile(new URL('../public/' + path, import.meta.url));

test('home target icon uses centered SVG geometry instead of a font-dependent glyph', async () => {
  const [component, css] = await Promise.all(['app/HomeLocationSummary.tsx', 'app/home-discovery.css'].map(source));
  assert.match(component, /home-location-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"/);
  assert.match(component, /<circle cx="12" cy="12" r="7" \/><path d="M12 2v20M2 12h20"/);
  assert.doesNotMatch(component, /⌖/);
  assert.match(css, /\.home-location-symbol > svg\s*\{ display:block; width:20px; height:20px;/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?\.home-location-symbol\s*\{[^}]*translateX\(-4px\)/);
});

test('footer has one shared divider, with no duplicate lines or padding on desktop or stacked mobile text', async () => {
  const css = await source('app/footer-access.css');
  assert.match(css, /\.public-footer-bottom\s*\{ padding-top:18px; border-top:1px solid #272b39;/);
  assert.match(css, /\.public-footer-bottom > span, \.public-footer-bottom \.public-footer-meta > span\s*\{ padding-top:0; border-top:0;/);
});

test('all browser icon links and the manifest use fresh Chile3X paths while originals remain valid fallbacks', async () => {
  const layout = await source('app/layout.tsx');
  const manifest = JSON.parse(await source('public/site.webmanifest'));
  const pairs = [
    ['favicon-48.png', 'chile3x-favicon-48-20261020.png'],
    ['favicon-192.png', 'chile3x-favicon-192-20261020.png'],
    ['favicon-512.png', 'chile3x-favicon-512-20261020.png'],
    ['favicon.ico', 'chile3x-favicon-20261020.ico'],
    ['apple-touch-icon.png', 'chile3x-apple-touch-20261020.png'],
  ];
  const hash = value => createHash('sha256').update(value).digest('hex');
  for (const [oldPath, freshPath] of pairs) {
    assert.ok(layout.includes('/' + freshPath));
    assert.equal(hash(await bytes(oldPath)), hash(await bytes(freshPath)), freshPath);
  }
  assert.ok(manifest.icons.every(icon => layout.includes(icon.src)));
  assert.match(layout, /manifest: "\/site.webmanifest\?v=20261020"/);
  const icons = layout.slice(layout.indexOf('icons:'), layout.indexOf('manifest:'));
  assert.doesNotMatch(icons, /arsmate|onlyfans|https?:\/\//i);
});
