import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("D1 migration keeps multiple agencies and rentals but frees/rechecks only the Escort slot", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE profiles (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, type TEXT NOT NULL)");
    for (const path of ["drizzle/0034_one_escort_per_account.sql", "drizzle/0037_loud_captain_america.sql"]) {
      const migration = await source(path);
      for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) db.exec(statement);
    }
    const add = db.prepare("INSERT INTO profiles (id, owner_id, type) VALUES (?, 'owner', ?)");
    add.run("agency-1", "agency");
    add.run("agency-2", "agency");
    add.run("rental-1", "rental");
    add.run("rental-2", "rental");
    add.run("escort-1", "escort");
    assert.throws(() => add.run("escort-2", "escort"), /escort_profile_owner_conflict/);
    db.prepare("UPDATE profiles SET trashed_at = ? WHERE id = 'escort-1'").run(new Date().toISOString());
    add.run("escort-2", "escort");
    assert.throws(() => db.exec("UPDATE profiles SET trashed_at = NULL WHERE id = 'escort-1'"), /escort_profile_owner_conflict/);
    db.exec("UPDATE profiles SET trashed_at = '2026-09-30T00:00:00Z' WHERE id = 'escort-2'");
    db.exec("UPDATE profiles SET trashed_at = NULL WHERE id = 'escort-1'");
    assert.equal(db.prepare("SELECT count(*) AS n FROM profiles WHERE type='escort' AND trashed_at IS NULL").get().n, 1);
  } finally {
    db.close();
  }
});

test("trash and permanent deletion are admin-authorized, audited and hidden from public paths", async () => {
  const [permissions, adminRoute, userRoute, trash, visibility, directory, media, adminPage, accountPage, cityAlert, agencyInvite, storyRoute] = await Promise.all([
    source("lib/admin-permissions.ts"), source("app/api/admin/profiles/[profileId]/papelera/route.ts"),
    source("app/api/perfiles/[profileId]/papelera/route.ts"), source("lib/profile-trash.ts"),
    source("lib/public-profile-visibility.ts"), source("lib/directory.ts"), source("app/media/[mediaId]/route.ts"),
    source("app/admin/anuncios-publicaciones/papelera/page.tsx"), source("app/mi-cuenta/page.tsx"),
    source("app/api/perfiles/[profileId]/avisos-ciudad/route.ts"), source("app/api/solicitudes-agencia/[requestId]/route.ts"), source("app/api/historias/[storyId]/route.ts"),
  ]);
  assert.match(permissions, /"profiles\.recycle"/);
  assert.match(adminRoute, /adminHasCapability\(admin, "profiles\.recycle"\)/);
  assert.match(adminRoute, /ELIMINAR DEFINITIVAMENTE/);
  assert.match(userRoute, /getCurrentUser\(\)/);
  assert.doesNotMatch(userRoute, /restoreProfile/);
  assert.match(trash, /profile\.ownerId !== actor\.id/);
  assert.match(trash, /db\.batch\(/);
  assert.match(trash, /db\.delete\(profiles\)/);
  assert.match(trash, /profileReportEvidence/);
  assert.doesNotMatch(trash, /db\.delete\(exclusiveContentCollections\)/);
  assert.match(visibility, /profiles\.trashedAt/);
  assert.match(directory, /isNull\(profiles\.trashedAt\)/);
  assert.match(media, /record\.profile\.trashedAt/);
  assert.match(adminPage, /name="origen"/);
  assert.match(adminPage, /name="autor"/);
  assert.match(adminPage, /Ver fotos y videos asociados/);
  assert.match(accountPage, /isNull\(profiles\.trashedAt\)/);
  for (const route of [cityAlert, agencyInvite, storyRoute]) assert.match(route, /isNull\(profiles\.trashedAt\)/);
});
