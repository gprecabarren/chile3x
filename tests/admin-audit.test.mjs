import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const administrativeMutationRoutes = [
  "app/api/admin/contenido/[mediaId]/route.ts",
  "app/api/admin/cuentas/[userId]/perfiles/route.ts",
  "app/api/admin/media/[mediaId]/route.ts",
  "app/api/admin/noticias/[postId]/route.ts",
  "app/api/admin/noticias/media/route.ts",
  "app/api/admin/noticias/route.ts",
  "app/api/admin/profiles/[profileId]/status/route.ts",
  "app/api/admin/reportes/[reportId]/route.ts",
  "app/api/admin/resenas/[reviewId]/route.ts",
  "app/api/admin/settings/route.ts",
  "app/api/admin/users/[userId]/estado/route.ts",
  "app/api/admin/users/[userId]/route.ts",
  "app/api/admin/users/route.ts",
];

test("every administrative mutation route records an audit event", async () => {
  for (const path of administrativeMutationRoutes) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /recordAdminAudit\(/, path);
  }
});

test("audit snapshots redact authentication and storage secrets", async () => {
  const source = await readFile(new URL("../lib/admin-audit.ts", import.meta.url), "utf8");
  assert.match(source, /password\|secret\|token\|hash\|r2key/i);
  assert.match(source, /\[protegido\]/);
  assert.doesNotMatch(source, /actorPassword|accessToken:/);
});

test("GitHub administrators resolve to dedicated identities before a session is issued", async () => {
  const source = await readFile(new URL("../app/api/auth/github/callback/route.ts", import.meta.url), "utf8");
  assert.match(source, /adminGithubIdentities/);
  assert.match(source, /githubUserId/);
  assert.match(source, /admin\.login/);
});
