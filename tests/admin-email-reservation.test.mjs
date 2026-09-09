import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("administrative invitations reserve a unique verified GitHub email", async () => {
  const [page, route, callback, schema] = await Promise.all([
    read("app/admin/administradores/page.tsx"),
    read("app/api/admin/administradores/route.ts"),
    read("app/api/auth/github/callback/route.ts"),
    read("db/schema.ts"),
  ]);

  assert.match(page, /name="protected_email"[^>]*type="email"[^>]*required/);
  assert.match(route, /protectedEmail = String\(form\.get\("protected_email"\)/);
  assert.match(route, /ne\(users\.role, "admin"\)/);
  assert.match(route, /protectedEmail,/);
  assert.match(schema, /admin_github_access_email_unique/);
  assert.match(callback, /verifiedEmails\.includes\(grant\.protectedEmail\)/);
  assert.match(callback, /publicAccountConflict/);
});

test("public registration paths reject reserved administrative emails", async () => {
  const [passwordRegistration, googleRegistration, assistedRegistration] = await Promise.all([
    read("app/api/auth/register/route.ts"),
    read("app/api/auth/google/route.ts"),
    read("app/api/admin/users/route.ts"),
  ]);

  for (const route of [passwordRegistration, googleRegistration, assistedRegistration]) {
    assert.match(route, /isReservedAdminEmail/);
  }
});
