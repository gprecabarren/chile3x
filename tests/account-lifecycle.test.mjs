import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("voluntary and administrative account disabling remain independent", async () => {
  const [schema, userRoute, adminRoute, login, reactivation] = await Promise.all([
    source("db/schema.ts"), source("app/api/mi-cuenta/estado/route.ts"), source("app/api/admin/users/[userId]/estado/route.ts"), source("app/api/auth/login/route.ts"), source("app/api/auth/reactivate/route.ts"),
  ]);
  assert.match(schema, /selfDisabledAt/);
  assert.match(schema, /adminDisabledAt/);
  assert.match(userRoute, /selfDisabledAt: now, isActive: false/);
  assert.match(adminRoute, /const isActive = !adminDisabledAt && !target\.selfDisabledAt/);
  assert.ok(login.indexOf("user.adminDisabledAt") < login.indexOf("user.selfDisabledAt"));
  assert.match(reactivation, /isNull\(users\.adminDisabledAt\)/);
});

test("permanent account deletion requires explicit confirmation and retains only matching history", async () => {
  const [userRoute, adminRoute, deletion, schema] = await Promise.all([
    source("app/api/mi-cuenta/eliminar/route.ts"), source("app/api/admin/users/[userId]/eliminar/route.ts"), source("lib/account-deletion.ts"), source("db/schema.ts"),
  ]);
  for (const route of [userRoute, adminRoute]) {
    assert.match(route, /assertSameOrigin/);
    assert.match(route, /ELIMINAR/);
  }
  assert.match(deletion, /db\.delete\(profiles\)/);
  assert.match(deletion, /db\.delete\(users\)/);
  assert.match(deletion, /emailHash: await sha256/);
  assert.doesNotMatch(schema.match(/accountDeletionHistory[\s\S]*?\}\);/)?.[0] ?? "", /email:\s*text/);
});

test("owner hiding is separate from the reserved paid-period pause", async () => {
  const [visibility, publicCondition, accountPage, pauseRoute] = await Promise.all([
    source("app/api/perfiles/[profileId]/visibilidad/route.ts"), source("lib/public-profile-visibility.ts"), source("app/mi-cuenta/page.tsx"), source("app/api/perfiles/[profileId]/pausa/route.ts"),
  ]);
  assert.match(visibility, /eq\(profiles\.ownerId, user\.id\)/);
  assert.match(publicCondition, /profiles\.ownerHiddenAt/);
  assert.match(publicCondition, /users\.isActive/);
  assert.doesNotMatch(accountPage, /\/pausa/);
  assert.match(pauseRoute, /listingPeriods/);
});

test("approved contact-only edits stay published while other changes return to review", async () => {
  const submission = await source("lib/profile-submission.ts");
  assert.match(submission, /const contactOnly = existing\.profile\.status === "approved"/);
  assert.match(submission, /contactOnly \? "approved"/);
  assert.match(submission, /if \(!contactOnly\) await replaceProfileCollections/);
});

test("large admin lists paginate in SQL and do not prefetch every detail", async () => {
  const [accounts, media, pagination, shell] = await Promise.all([
    source("app/admin/cuentas/page.tsx"), source("app/admin/medios/page.tsx"), source("app/admin/pagination.tsx"), source("app/admin/_components.tsx"),
  ]);
  assert.match(accounts, /\.limit\(PAGE_SIZE\)/);
  assert.match(media, /countDistinct/);
  assert.match(media, /\.limit\(PAGE_SIZE\)/);
  assert.match(pagination, /prefetch=\{false\}/);
  assert.match(shell, /prefetch=\{false\}/);
});
