import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Apple remains visibly disabled until every administrative requirement exists", async () => {
  const [button, login, register, settingsPage, settingsRoute] = await Promise.all([
    read("app/AppleSignInButton.tsx"),
    read("app/ingresar/page.tsx"),
    read("app/registro/page.tsx"),
    read("app/admin/configuracion/[section]/page.tsx"),
    read("app/api/admin/settings/route.ts"),
  ]);
  assert.match(login, /<AppleSignInButton/);
  assert.match(register, /<AppleSignInButton/);
  assert.match(button, /disabled aria-disabled="true"/);
  assert.doesNotMatch(button, /Próximamente · requiere configurar Apple Developer/);
  for (const field of ["apple_services_id", "apple_team_id", "apple_key_id", "apple_primary_app_id"]) assert.match(settingsPage, new RegExp(`name="${field}"`));
  assert.match(settingsPage, /https:\/\/chile3x\.cl\/api\/auth\/apple\/callback/);
  assert.match(settingsPage, /APPLE_PRIVATE_KEY/);
  assert.match(settingsPage, /APPLE_TOKEN_ENCRYPTION_KEY/);
  assert.match(settingsRoute, /Completa todos los identificadores de Apple antes de activar/);
  assert.match(settingsRoute, /env\.APPLE_PRIVATE_KEY/);
  assert.doesNotMatch(settingsPage, /name="apple_private_key"/);
});

test("Apple authorization is replay-safe and rejects cross-provider duplicates", async () => {
  const [flow, callback, google, register, schema, migration, deletion] = await Promise.all([
    read("lib/apple-auth-flow.ts"),
    read("app/api/auth/apple/callback/route.ts"),
    read("app/api/auth/google/route.ts"),
    read("app/api/auth/register/route.ts"),
    read("db/schema.ts"),
    read("drizzle/0029_dazzling_blockbuster.sql"),
    read("lib/account-deletion.ts"),
  ]);
  assert.match(flow, /delete\(appleAuthAttempts\)[\s\S]*returning/);
  assert.match(callback, /verifyAppleIdentity/);
  assert.match(callback, /apple_conflict_google/);
  assert.match(google, /registrado con Apple/);
  assert.match(register, /createUserSession\(userId, request, "apple"\)/);
  assert.match(schema, /accountAppleIdentities/);
  assert.match(migration, /CREATE TABLE `account_apple_identities`/);
  assert.match(deletion, /revokeAppleGrantForUser/);
});
