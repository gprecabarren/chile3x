import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import {isSamplePath} from '../lib/private-sample-policy.ts';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('administrator entry appears only as a plain non-prefetched footer link beside the country label', async () => {
  const component = await source('app/directorio/_components.tsx');
  const footer = component.slice(component.indexOf('export async function PublicFooter'), component.indexOf('export async function PortalContactLinks'));
  assert.match(footer, /Chile · Directorio para adultos<\/span><a className="footer-admin-access" href="\/admin" rel="nofollow">Acceso administrador<\/a>/);
  assert.equal((footer.match(/href="\/admin"/g) ?? []).length, 1);
  const css = await source('app/footer-access.css');
  assert.match(css, /flex-wrap:wrap/);
  assert.match(css, /\.footer-admin-access:focus-visible/);
  assert.match(css, /@media\(max-width:620px\)[\s\S]*?padding-right:62px/);
});

test('administrator indexing stays disabled at metadata, robots and sitemap levels without changing authorization', async () => {
  const [layout, seo, robots, sitemap, admin] = await Promise.all(['app/admin/layout.tsx', 'lib/seo.ts', 'app/robots.ts', 'app/sitemap.ts', 'app/admin/page.tsx'].map(source));
  assert.match(layout, /privatePageMetadata\(/);
  assert.match(seo.slice(seo.indexOf('export function privatePageMetadata')), /index: false,[\s\S]*?follow: false/);
  assert.match(robots, /disallow: \["\/admin"/);
  assert.doesNotMatch(sitemap, /siteUrl\}\/admin/);
  assert.match(admin, /if \(!admin\)\s*\{\s*redirect\("\/api\/auth\/github\/start\?return_to=\/admin"\)/);
});

test('all admin responses including redirects get noindex/no-store without modifying location, cookies or public headers', async () => {
  const worker = await source('worker/index.ts');
  const start = worker.indexOf('function withSecurityHeaders(');
  const end = worker.indexOf('\nfunction addPublicCacheHeaders', start);
  const fn = worker.slice(start, end).replace('response: Response, pathname = "", privateDocument = false', 'response, pathname = "", privateDocument = false');
  const securityHeaders = vm.runInNewContext(fn + '\nwithSecurityHeaders;', { Headers, Response, isSamplePath });
  for (const path of ['/admin', '/admin/', '/admin/medios', '/admin/acceso-denegado']) {
    const original = new Response(null, { status:302, headers:{ location:'/api/auth/github/start?return_to=/admin', 'set-cookie':'test=value; HttpOnly; Secure' } });
    const response = securityHeaders(original, path);
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), original.headers.get('location'));
    assert.equal(response.headers.get('set-cookie'), original.headers.get('set-cookie'));
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, nosnippet');
    assert.match(response.headers.get('cache-control'), /private, no-store/);
  }
  for (const path of ['/', '/escorts/chillan', '/administrador-publico']) {
    assert.equal(securityHeaders(new Response('public'), path).headers.get('x-robots-tag'), null);
  }
});
