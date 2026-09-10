import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  describeUserAgent,
  sessionContextFromRequest,
  sessionLocation,
} from "../lib/session-context.ts";
import { scanR2Storage } from "../lib/storage-audit.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("session context keeps Cloudflare IP and approximate location without coordinates", () => {
  const request = new Request("https://chile3x.cl/ingresar", {
    headers: {
      "cf-connecting-ip": "2001:db8::1234",
      "cf-ipcountry": "CL",
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1",
    },
  });
  Object.assign(request, { cf: { country: "CL", region: "Biobío", city: "Concepción", timezone: "America/Santiago", latitude: "-36.8" } });
  const context = sessionContextFromRequest(request);
  assert.deepEqual(context, {
    ipAddress: "2001:db8::1234",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1",
    countryCode: "CL",
    region: "Biobío",
    city: "Concepción",
    timezone: "America/Santiago",
  });
  assert.match(sessionLocation(context), /Concepción, Biobío, Chile/);
  assert.deepEqual(describeUserAgent(context.userAgent), {
    browser: "Safari",
    operatingSystem: "iOS/iPadOS",
    device: "Móvil",
    label: "Safari en iOS/iPadOS",
  });
});

test("all authentication methods create sessions with request metadata", async () => {
  const [auth, password, google, github, register, reactivate] = await Promise.all([
    read("lib/auth.ts"),
    read("app/api/auth/login/route.ts"),
    read("app/api/auth/google/route.ts"),
    read("app/api/auth/github/callback/route.ts"),
    read("app/api/auth/register/route.ts"),
    read("app/api/auth/reactivate/route.ts"),
  ]);
  assert.match(auth, /sessionContextFromRequest\(request\)/);
  assert.match(password, /createUserSession\(user\.id, request, "password"\)/);
  assert.match(google, /createUserSession\(account\.userId, request, "google"\)/);
  assert.match(github, /createAdminSession\(admin\.id, request\)/);
  assert.match(register, /createUserSession\(userId, request, "google"\)/);
  assert.match(reactivate, /createUserSession\(intent\.userId, request, "reactivation"\)/);
});

test("session revocation is same-origin and ownership scoped for public and admin accounts", async () => {
  const [helper, publicRoute, adminRoute] = await Promise.all([
    read("lib/session-management.ts"),
    read("app/api/mi-cuenta/sesiones/route.ts"),
    read("app/api/admin/sesiones/route.ts"),
  ]);
  assert.match(helper, /eq\(authSessions\.userId, userId\)/);
  assert.match(helper, /ne\(authSessions\.id, currentSessionId\)/);
  for (const route of [publicRoute, adminRoute]) {
    assert.match(route, /assertSameOrigin\(request\)/);
    assert.match(route, /revokeOwnedSession/);
    assert.match(route, /revokeOtherSessions/);
  }
  assert.match(adminRoute, /admin\.sessions_revoke/);
});

test("the existing summaries expose session management and restrict global operations", async () => {
  const [accountPage, adminPage, storageRoute, panel] = await Promise.all([
    read("app/mi-cuenta/page.tsx"),
    read("app/admin/page.tsx"),
    read("app/api/admin/operaciones/almacenamiento/route.ts"),
    read("app/admin/OperationalPanel.tsx"),
  ]);
  assert.match(accountPage, /<SessionManager/);
  assert.match(adminPage, /<SessionManager/);
  assert.match(adminPage, /canViewOperations = adminHasCapability\(admin, "settings\.manage"\)/);
  assert.doesNotMatch(adminPage, /if \(!adminHasCapability\(admin, "private\.view"\)\)/);
  assert.match(storageRoute, /adminHasCapability\(admin, "settings\.manage"\)/);
  assert.match(storageRoute, /MAX_R2_OBJECTS_PER_SCAN = 20_000/);
  assert.doesNotMatch(storageRoute, /MEDIA\.delete/);
  assert.match(panel, /Ver más: filtros y eventos/);
});

test("operational storage snapshots retain aggregates instead of private R2 keys", async () => {
  const [schema, migration, operations] = await Promise.all([
    read("db/schema.ts"),
    read("drizzle/0025_organic_kronos.sql"),
    read("lib/operations.ts"),
  ]);
  const snapshotTable = schema.match(/operationalStorageSnapshots[\s\S]*?\n\}\);/)?.[0] ?? "";
  assert.doesNotMatch(snapshotTable, /r2Key|objectKey|object_key/);
  assert.match(migration, /CREATE TABLE `__new_auth_sessions`[\s\S]*?`ip_address` text/);
  assert.match(migration, /SELECT `id`, `user_id`, `token_hash`, 'unknown', `created_at`, `expires_at`, `created_at`/);
  assert.match(migration, /CREATE TABLE `operational_events`/);
  assert.match(operations, /email\|ip\|token\|secret\|key\|password/i);
});

test("R2 audit follows cursors, totals bytes and never exposes object keys", async () => {
  const calls = [];
  const bucket = {
    async list(options) {
      calls.push(options);
      if (!options.cursor) return { objects: [{ key: "known.jpg", size: 10 }, { key: "orphan.jpg", size: 7 }], truncated: true, cursor: "next" };
      return { objects: [{ key: "other-known.jpg", size: 20 }], truncated: false };
    },
  };
  const result = await scanR2Storage(bucket, new Set(["known.jpg", "other-known.jpg", "missing.jpg"]), 10);
  assert.deepEqual(result, { status: "complete", objectCount: 3, r2Bytes: 37, orphanObjectCount: 1, orphanBytes: 7, missingObjectCount: 1 });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].cursor, "next");
  assert.equal(JSON.stringify(result).includes("orphan.jpg"), false);
});
