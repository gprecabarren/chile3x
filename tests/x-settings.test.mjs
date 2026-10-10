import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { encryptXClientSecret, decryptXClientSecret, validXClientId, validXClientSecret } from '../lib/x-secrets.ts';
const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('X configuration secrets have authenticated, randomized encryption and reject tampering', async () => {
  const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
  const secret = 'test-only-private-secret-never-a-live-credential';
  const encrypted = await encryptXClientSecret(secret, key), second = await encryptXClientSecret(secret, key);
  assert.notEqual(encrypted, second); assert.doesNotMatch(encrypted, /test-only-private/);
  assert.equal(await decryptXClientSecret(encrypted, key), secret);
  await assert.rejects(decryptXClientSecret(encrypted, Buffer.alloc(32, 7).toString('base64url')));
  const [version, iv, body] = encrypted.split('.');
  await assert.rejects(decryptXClientSecret(`${version}.${iv}.${body[0] === 'A' ? 'B' : 'A'}${body.slice(1)}`, key));
  await assert.rejects(encryptXClientSecret(secret, 'invalid-key'));
  await assert.rejects(decryptXClientSecret('v2.invalid.data', key));
});

test('X configuration validates bounded printable credentials', () => {
  assert.ok(validXClientId('test-client-id-12345')); assert.ok(validXClientSecret('test-secret-value-12345'));
  for (const value of ['', '<script>', 'a'.repeat(181)]) assert.equal(validXClientId(value), false);
  for (const value of ['', 'short', 'test-secret-value\n12345', 'a'.repeat(513)]) assert.equal(validXClientSecret(value), false);
});

test('X private settings cannot become public, never prefill secrets and require explicit admin activation', async () => {
  const defaults = await source('lib/site-settings.ts'), route = await source('app/api/admin/x-settings/route.ts');
  assert.doesNotMatch(defaults, /x_oauth_client_secret/); assert.match(defaults, /x_sign_in_status: "disabled"/);
  assert.match(route, /assertSameOrigin\(request\)/); assert.match(route, /adminHasCapability\(admin, "settings.manage"\)/);
  assert.match(route, /x_activation_confirmed/); assert.match(route, /encryptXClientSecret\(newSecret/);
  assert.match(route, /db.batch\(/); assert.match(route, /db.delete\(xAuthAttempts\)/); assert.match(route, /db.delete\(xRegistrationIntents\)/);
  assert.match(route, /recordAdminAudit/); assert.doesNotMatch(route, /after:\s*\{[^}]*:\s*newSecret/);
  const page = await source('app/admin/configuracion/[section]/page.tsx');
  assert.match(page, /name="x_oauth_client_secret" type="password"/);
  assert.doesNotMatch(page, /defaultValue=\{[^}]*clientSecret/);
  assert.match(page, /name === "x" \? "\/api\/admin\/x-settings"/);
  assert.match(await source('app/admin/configuracion/page.tsx'), /\["x", "Inicio con X"/);
});
