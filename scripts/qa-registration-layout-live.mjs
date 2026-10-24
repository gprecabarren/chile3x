// Read-only anonymous checks: never submits the registration form.
import assert from 'node:assert/strict';

const base = 'https://chile3x.cl';
const request = url => fetch(new URL(url, base), { redirect:'manual', signal:AbortSignal.timeout(20_000) });
const response = await request('/registro');
assert.equal(response.status, 200);
const html = await response.text();
// The session boundary may initially render its safe loading shell; the form
// still travels in the streamed page payload and is checked in the browser too.
assert.ok(html.includes('/api/auth/register'), 'Registration endpoint in page payload');
assert.ok(/<meta name="robots" content="[^"]*noindex/.test(html), 'Registration remains noindex');
assert.doesNotMatch(html, /Worker exceeded resource limits|\d+:E\{/);

const stylesheets = (html.match(/<link\b[^>]+>/g) ?? [])
  .filter(tag => tag.includes('rel="stylesheet"'))
  .map(tag => tag.match(/href="([^"]+)"/)?.[1])
  .filter(Boolean)
  .map(path => new URL(path, base))
  .filter(url => url.origin === base);
const css = (await Promise.all(stylesheets.map(async url => {
  const asset = await request(url);
  assert.equal(asset.status, 200);
  return asset.text();
}))).join('\n');
assert.ok(/width:\s*min\(100%,\s*840px\)/.test(css), 'Compact registration card CSS');
assert.ok(/\.auth-register-card\s+\.date-parts-field\s+select\s*\{[^}]*padding-right:\s*26px\s*!important/.test(css), 'Date-specific arrow padding CSS');
assert.ok(/\.auth-register-card\s+\.account-identity-optional\s+\.form-grid\s*>\s*label\s*\{[^}]*align-content:\s*start/.test(css), 'Top-aligned optional document labels CSS');
assert.ok(/\.auth-register-card\s+\.registration-password-entry\s+\.account-password-visibility-button\s*\{[^}]*height:\s*46px;[^}]*margin:\s*0/.test(css), 'Inline password eye has the same height and no top margin');
console.log('PASS registration: 200, noindex and existing form endpoint in the page payload.');
console.log('PASS published layout: compact card, readable date padding and top-aligned document labels.');
console.log('PASS published password eye: 46px square and no inherited top margin.');
