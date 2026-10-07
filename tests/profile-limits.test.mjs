import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { hasUnlimitedEscortListings } from "../lib/profile-limits.ts";

const source = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const authorized = { id: "usr_b876b728-e6e9-48cd-9d78-db0124556362", email: "hiragasaito4@hotmail.com" };

test("unlimited Escort permission requires the exact existing account and normalized email", () => {
  assert.equal(hasUnlimitedEscortListings(authorized), true);
  assert.equal(hasUnlimitedEscortListings({ ...authorized, email: " HIRAGASAITO4@HOTMAIL.COM " }), true);
  assert.equal(hasUnlimitedEscortListings({ ...authorized, id: "another-account" }), false);
  assert.equal(hasUnlimitedEscortListings({ ...authorized, email: "other@hotmail.com" }), false);
  assert.equal(hasUnlimitedEscortListings({ ...authorized, email: "hiragasaito4hotmail.com" }), false);
  assert.equal(hasUnlimitedEscortListings({ id: "another-account", email: "other@hotmail.com", unlimitedEscort: true }), false);
});

test("database enforces the same exception on creation, ownership changes and trash restoration", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON; CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL); CREATE TABLE profiles (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL)");
    db.prepare("INSERT INTO users (id, email) VALUES (?, ?)").run(authorized.id, authorized.email);
    db.exec("INSERT INTO users VALUES ('regular', 'regular@example.invalid'), ('second', 'second@example.invalid')");
    for (const path of ["drizzle/0034_one_escort_per_account.sql", "drizzle/0037_loud_captain_america.sql", "drizzle/0039_scoped_escort_exception.sql"]) {
      const migration = await source(path);
      for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) db.exec(statement);
    }
    const add = db.prepare("INSERT INTO profiles (id, owner_id, type) VALUES (?, ?, ?)");
    for (let i = 0; i < 100; i++) add.run(`allowed-${i}`, authorized.id, "escort");
    add.run("regular-1", "regular", "escort");
    assert.throws(() => add.run("regular-2", "regular", "escort"), /escort_profile_owner_conflict/);
    // Bypassing the UI or moving an authorized listing to another owner does
    // not bypass the regular account's database constraint.
    assert.throws(() => db.prepare("UPDATE profiles SET owner_id='regular' WHERE id=?").run("allowed-0"), /escort_profile_owner_conflict/);
    for (const type of ["agency", "rental"]) for (let i = 0; i < 3; i++) add.run(`${type}-${i}`, "regular", type);
    db.exec("UPDATE profiles SET trashed_at='2026-10-07' WHERE id IN ('allowed-0', 'regular-1')");
    add.run("regular-2", "regular", "escort");
    db.exec("UPDATE profiles SET trashed_at=NULL WHERE id='allowed-0'");
    assert.throws(() => db.exec("UPDATE profiles SET trashed_at=NULL WHERE id='regular-1'"), /escort_profile_owner_conflict/);
    assert.equal(db.prepare("SELECT count(*) AS n FROM profiles WHERE owner_id=? AND type='escort' AND trashed_at IS NULL").get(authorized.id).n, 100);
    // Moving the email does not transfer the identity-bound authorization.
    db.prepare("UPDATE users SET email='changed@example.invalid' WHERE id=?").run(authorized.id);
    db.prepare("UPDATE users SET email=? WHERE id='second'").run(authorized.email);
    assert.throws(() => add.run("allowed-after-email-change", authorized.id, "escort"), /escort_profile_owner_conflict/);
    add.run("second-1", "second", "escort");
    assert.throws(() => add.run("second-2", "second", "escort"), /escort_profile_owner_conflict/);
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(db.prepare("SELECT count(*) AS n FROM profiles WHERE owner_id=?").get(authorized.id).n, 100, "migration and permission changes must not delete historical listings");
  } finally { db.close(); }
});

test("server-side creation, admin restoration and both forms respect the scoped permission", async () => {
  const [creation, trash, ownerForm, adminForm, route] = await Promise.all([
    source("lib/profile-submission.ts"), source("lib/profile-trash.ts"),
    source("app/mi-cuenta/nuevo-perfil/page.tsx"), source("app/admin/cuentas/[userId]/crear-perfil/page.tsx"),
    source("app/api/perfiles/nuevo/route.ts"),
  ]);
  assert.match(creation, /if \(!owner \|\| !hasUnlimitedEscortListings\(owner\)\)/);
  assert.match(trash, /if \(!owner \|\| !hasUnlimitedEscortListings\(owner\)\)/);
  assert.match(ownerForm, /allowEscort=\{hasUnlimitedEscortListings\(user\) \|\| !escort\}/);
  assert.match(adminForm, /allowEscort=\{unlimitedEscort \|\| !escort\}/);
  assert.match(route, /createProfile\(user\.id, submission\)/);
  assert.match(creation, /submission.intent === "submit" \? "pending" : "draft"/);
});
