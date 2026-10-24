import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('registration has a scoped compact card without changing other auth pages or text weight', async () => {
  const [page, css] = await Promise.all(['app/registro/page.tsx', 'app/registro/registration-layout.css'].map(source));
  assert.match(page, /import "\.\/registration-layout\.css"/);
  assert.match(css, /\.auth-register-card\s*\{\s*width:min\(100%,840px\)/);
  assert.doesNotMatch(css, /font-weight/);
  assert.equal((css.match(/:\s*[^;{}]+!important\s*;/g) ?? []).length, 1);
  assert.match(page, /action="\/api\/auth\/register" method="post"/);
});

test('registration gives year and month readable space with compact arrows and a narrow mobile fallback', async () => {
  const css = await source('app/registro/registration-layout.css');
  assert.match(css, /\.account-birth-date\s*\{ width:min\(100%,360px\); min-width:0;/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.5fr\) minmax\(0,\.75fr\)/);
  assert.match(css, /padding:10px 26px 10px 9px/);
  assert.match(css, /padding-right:26px !important/);
  assert.match(css, /@media\(min-width:900px\)[\s\S]*?grid-template-columns:300px minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:360px\)[\s\S]*?grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.45fr\)/);
  assert.match(css, /@media\(max-width:620px\)[\s\S]*?font-size:16px/);
});

test('document labels align from the top and all text/select controls share a height despite helper text', async () => {
  const css = await source('app/registro/registration-layout.css');
  assert.match(css, /\.auth-register-card \.account-identity-optional \.form-grid\s*\{ align-items:start; gap:16px;/);
  assert.match(css, /\.auth-register-card \.account-identity-optional \.form-grid > label\s*\{ align-content:start; gap:7px;/);
  assert.match(css, /:is\(input:not\(\[type="hidden"\],\[type="checkbox"\],\[type="radio"\]\),select\)\s*\{[^}]*height:46px;\s*min-height:46px/);
});

test('password eye is a 46px square without the generic auth button top margin at any viewport', async () => {
  const css = await source('app/registro/registration-layout.css');
  assert.match(css, /\.auth-register-card \.registration-password-entry\s*\{\s*grid-template-columns:minmax\(0,1fr\) 46px;\s*align-items:start/);
  assert.match(css, /\.auth-register-card \.registration-password-entry \.account-password-visibility-button\s*\{\s*width:46px;\s*min-width:46px;\s*height:46px;\s*min-height:46px;\s*margin:0/);
});
