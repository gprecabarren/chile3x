import assert from "node:assert/strict";
import test from "node:test";
import { adminHasCapability, isAdminAccessLevel } from "../lib/admin-permissions.ts";

const admin = (accessLevel, isProtectedOwner = false) => ({ accessLevel, isProtectedOwner });

test("only the protected owner can manage administrative grants", () => {
  assert.equal(adminHasCapability(admin("owner", true), "admins.manage"), true);
  assert.equal(adminHasCapability(admin("owner", false), "admins.manage"), false);
  assert.equal(adminHasCapability(admin("administrator"), "admins.manage"), false);
});

test("each delegated role receives only its intended capabilities", () => {
  assert.equal(adminHasCapability(admin("administrator"), "settings.manage"), true);
  assert.equal(adminHasCapability(admin("moderator"), "profiles.moderate"), true);
  assert.equal(adminHasCapability(admin("moderator"), "accounts.manage"), false);
  assert.equal(adminHasCapability(admin("editor"), "news.manage"), true);
  assert.equal(adminHasCapability(admin("editor"), "private.view"), false);
  assert.equal(adminHasCapability(admin("support"), "reports.manage"), true);
  assert.equal(adminHasCapability(admin("support"), "bugs.manage"), true);
  assert.equal(adminHasCapability(admin("support"), "media.moderate"), false);
});

test("unknown or missing access levels are rejected", () => {
  assert.equal(isAdminAccessLevel("owner"), true);
  assert.equal(isAdminAccessLevel("superadmin"), false);
  assert.equal(isAdminAccessLevel(null), false);
  assert.equal(adminHasCapability(null, "private.view"), false);
});
