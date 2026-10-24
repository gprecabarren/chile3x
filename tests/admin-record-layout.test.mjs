import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('record layout stays shared, bounded and free of additional rendering effects', async () => {
  const css = await source('app/admin-record-layout.css');
  const layout = await source('app/layout.tsx');
  assert.match(layout, /import ['"]\.\/admin-record-layout\.css['"]/);
  assert.match(css, /\.profile-admin-tools\s*\{[^}]*width:min\(100% - 56px,1184px\)/);
  assert.match(css, /\.profile-admin-tools \.admin-profile-trash-bar\s*\{[^}]*margin:18px 0 0/);
  assert.match(css, /\.admin-workspace \.admin-content \.admin-account-owned-profiles article\s*\{[^}]*padding:20px/);
  assert.match(css, /max-width:760px/);
  assert.match(css, /background:#0b1019/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.doesNotMatch(css, /backdrop-filter|@import|url\(|animation:|transform:/);
});

test('public-profile moderation and trash remain in the same revision scope', async () => {
  const page = await source('app/perfil/[slug]/page.tsx');
  const start = page.indexOf('<div className="profile-admin-tools">');
  const end = page.indexOf('</ReviewScope>', start);
  assert.ok(start >= 0 && end > start);
  const scope = page.slice(start, end);
  assert.match(scope, /className="admin-profile-review-bar"/);
  assert.match(scope, /className="admin-profile-trash-bar(?:\s[^"]*)?"/);
  assert.match(scope, /name="review_key" value=\{`profile:\$\{profile.id\}`\}/);
  assert.match(scope, /name="review_revision" value=\{profile.revision \?\? 0\}/);
});

test('password entry keeps an associated label, help, keyboard actions and safe autocomplete', async () => {
  const field = await source('app/admin/cuentas/AdminPasswordField.tsx');
  assert.match(field, /useId\(/);
  assert.match(field, /<label htmlFor=\{fieldId\}/);
  assert.match(field, /<input id=\{fieldId\} aria-describedby=\{`\$\{fieldId\}-help`\}/);
  assert.match(field, /className="admin-password-entry"/);
  assert.match(field, /autoComplete="new-password"/);
  assert.match(field, /disabled=\{!password\}/);
  assert.match(field, /aria-pressed=\{showPassword\}/);
});

test('review notices use compact desktop geometry with a mobile wrapping layout', async () => {
  const css = await source('app/collaboration.css');
  assert.match(css, /\.review-coordination\{[^}]*width:fit-content;max-width:100%/);
  assert.match(css, /\.review-coordination>span\{[^}]*overflow-wrap:anywhere/);
  assert.match(css, /\.review-coordination \.button\{[^}]*min-height:44px/);
  assert.match(css, /@media\(max-width:600px\)/);
});
