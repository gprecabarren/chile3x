import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("admin-assisted creation keeps ownership and continues directly to media", async () => {
  const [route, creation, page] = await Promise.all([
    source("app/api/admin/cuentas/[userId]/perfiles/route.ts"),
    source("lib/profile-submission.ts"),
    source("app/admin/cuentas/[userId]/perfiles/[profileId]/medios/page.tsx"),
  ]);
  assert.match(route, /createProfile\(owner\.id, submission, \{ adminCreator:/);
  assert.match(route, /\/perfiles\/\$\{encodeURIComponent\(profileId\)\}\/medios/);
  assert.match(creation, /if \(!options\.adminCreator\)/);
  assert.match(page, /eq\(profiles\.ownerId, userId\)/);
});

test("admin uploads require both account and media authority; owner uploads stay separate", async () => {
  const [admin, owner, shared] = await Promise.all([
    source("app/api/admin/profiles/[profileId]/media/route.ts"),
    source("app/api/perfiles/[profileId]/media/route.ts"),
    source("lib/profile-media-upload.ts"),
  ]);
  assert.match(admin, /assertSameOrigin/);
  assert.match(admin, /"accounts\.manage"/);
  assert.match(admin, /"media\.moderate"/);
  assert.match(admin, /moderationStatus: "approved"/);
  assert.match(admin, /!row\.ownerActive/);
  assert.match(owner, /profile\.ownerId !== user\.id/);
  assert.match(owner, /hasTesterAutoApproval\(user\) \? "approved" : "pending"/);
  assert.match(shared, /detectImageType\(data\)/);
  assert.match(shared, /detectVideoType\(data\)/);
  assert.match(shared, /MAX_PROFILE_MEDIA_BYTES/);
  assert.match(shared, /MEDIA_HARD_LIMIT_BYTES/);
});

test("a database trigger blocks new duplicate Escorts without modifying historical listings", async () => {
  const migration = await source("drizzle/0034_one_escort_per_account.sql");
  assert.match(migration, /BEFORE INSERT ON profiles/);
  assert.match(migration, /BEFORE UPDATE OF owner_id, type ON profiles/);
  assert.match(migration, /escort_profile_owner_conflict/);
  assert.doesNotMatch(migration, /DELETE FROM profiles/i);
});

test("account and listing origin remain attributable and filterable", async () => {
  const [schema, migration, accountList, accountDetails, listingList, register, adminAccount] = await Promise.all([
    source("db/schema.ts"), source("drizzle/0035_creation_provenance.sql"),
    source("app/admin/cuentas/page.tsx"), source("app/admin/cuentas/[userId]/page.tsx"),
    source("app/admin/anuncios-publicaciones/page.tsx"), source("app/api/auth/register/route.ts"),
    source("app/api/admin/users/route.ts"),
  ]);
  assert.match(schema, /creationSource: text\("creation_source"/);
  assert.match(migration, /UPDATE users SET[\s\S]*?admin_audit_logs/);
  assert.match(migration, /UPDATE profiles SET[\s\S]*?admin_audit_logs/);
  assert.match(accountList, /name="origin"/);
  assert.match(accountDetails, /Origen de la cuenta/);
  assert.match(listingList, /name="origen"/);
  assert.match(register, /creationSource: "self"/);
  assert.match(adminAccount, /creationSource: "admin"/);
});

test("image processing is optional, previewed and scoped to media moderators", async () => {
  const [editor, route, adminList] = await Promise.all([
    source("app/admin/medios/AdminMediaImageProcessing.tsx"),
    source("app/api/admin/media/[mediaId]/procesar/route.ts"),
    source("app/admin/medios/page.tsx"),
  ]);
  assert.match(editor, /Generar vista previa/);
  assert.match(editor, /Confirmar y reemplazar imagen/);
  assert.match(editor, /applyWatermark: watermark, blurFaces: blur/);
  assert.match(route, /"media\.moderate"/);
  assert.match(route, /detectImageType\(data\)/);
  assert.match(route, /record\.media\.mediaType !== "image"/);
  assert.match(adminList, /media\.mediaType === "image" && <AdminMediaImageProcessing/);
});

test("face detection WebAssembly is scoped to editing and session documents, never JavaScript eval", async () => {
  const worker = await source("worker/index.ts");
  assert.match(worker, /pathname === "\/admin\/medios"/);
  assert.match(worker, /wasmPermission = faceBlurPage \? " 'wasm-unsafe-eval'" : ""/);
  assert.match(worker, /withSecurityHeaders\(await handler.fetch\(request, env, ctx\), url.pathname, hasPrivateSession\(request\)\)/);
  assert.doesNotMatch(worker, /'unsafe-eval'/);
});
