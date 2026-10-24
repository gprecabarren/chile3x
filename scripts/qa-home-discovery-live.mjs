// Read-only public deployment checks. No cookies, credentials, login flow,
// mutation endpoints or administrator information are requested.
import assert from 'node:assert/strict';

const base = 'https://chile3x.cl';
const request = path => fetch(base + path, { redirect:'manual', signal:AbortSignal.timeout(20_000) });
const home = await request('/');
assert.equal(home.status, 200);
const html = await home.text();
assert.match(html, /home-location-heading/);
assert.match(html, /home-location-current/);
assert.match(html, /region-jump-select/);
assert.match(html, /<a class="footer-admin-access" href="\/admin" rel="nofollow">Acceso administrador<\/a>/);
assert.doesNotMatch(html, /Worker exceeded resource limits|\d+:E\{/);
console.log('PASS published home: unified controls and administrator footer link.');

const stylesheets = (html.match(/<link\b[^>]+>/g) ?? [])
  .filter(tag => tag.includes('rel="stylesheet"'))
  .map(tag => tag.match(/href="([^"]+)"/)?.[1])
  .filter(Boolean)
  .map(path => new URL(path, base))
  .filter(url => url.origin === base);
const css = (await Promise.all(stylesheets.map(async url => {
  const response = await fetch(url, { signal:AbortSignal.timeout(20_000) });
  assert.equal(response.status, 200);
  return response.text();
}))).join('\n');
assert.match(css, /max-width:\s*960px/);
assert.match(css, /\.home-discovery-controls\s+\.home-location-summary\s*>\s*\.home-location-heading\s*\{[^}]*gap:\s*16px/);
console.log('PASS published compact desktop width and explicit 16px icon spacing.');

for (const path of ['/admin', '/admin/medios']) {
  const response = await request(path);
  assert.ok(response.status >= 300 && response.status < 400);
  assert.match(response.headers.get('x-robots-tag'), /noindex, nofollow/);
  assert.match(response.headers.get('cache-control'), /private, no-store/);
  console.log(`PASS protected ${path}: ${response.status}, noindex/no-store.`);
}

const robots = await (await request('/robots.txt')).text();
assert.ok(robots.includes('Disallow: /admin') || /^Disallow: \/\s*$/m.test(robots));
const sitemap = await (await request('/sitemap.xml')).text();
assert.ok(!sitemap.includes('<loc>' + base + '/admin'));
console.log('PASS robots exclusion and no administrator URLs in sitemap.');
