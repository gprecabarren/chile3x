import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = await Promise.all([
  "../lib/profile.ts",
  "../lib/directory.ts",
  "../lib/profile-submission.ts",
  "../db/schema.ts",
  "../app/directorio/_components.tsx",
  "../app/mi-cuenta/ProfileForm.tsx",
  "../lib/faq.ts",
  "../app/globals.css",
  "../drizzle/0036_bronze_tier.sql",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));

const [profile, directory, submission, schema, components, form, faq, css, migration] = files;

test("Bronze is the persisted tier and appears consistently in public and account UI", () => {
  assert.match(profile, /tiers = \["bronze", "premium", "vip"\]/);
  assert.match(profile, /bronze: "Bronze"/);
  assert.match(schema, /enum: \["bronze", "premium", "vip"\]/);
  assert.match(schema, /\.default\("bronze"\)/);
  assert.match(directory, /bronze: 2/);
  assert.match(directory, /tierLabels\[profile\.tier\]/);
  assert.match(submission, /typeValue === "escort" \? tierValue : "bronze"/);
  assert.match(components, /profile\.tier === "bronze"/);
  assert.match(form, /defaultValue=\{initial\?\.tier \?\? "bronze"\}/);
  assert.match(form, /value="bronze"/);
  assert.match(faq, /avisos Escort pueden elegir VIP/);
  assert.match(faq, /Premium \(visibilidad intermedia\) o Bronze/);
  assert.doesNotMatch([profile, directory, submission, schema, components, form, faq].join("\n"), /\bgold\b/i);
});

test("migration converts existing rows, demo text and the database default without dropping profiles", () => {
  assert.match(migration, /ADD COLUMN `tier_bronze` text DEFAULT 'bronze' NOT NULL/);
  assert.match(migration, /WHEN `tier` = 'gold' THEN 'bronze'/);
  assert.match(migration, /WHERE `is_demo` = 1/);
  assert.match(migration, /DROP COLUMN `tier`/);
  assert.match(migration, /RENAME COLUMN `tier_bronze` TO `tier`/);
  assert.doesNotMatch(migration, /DROP TABLE/);
});

test("tier sections, profile badges and creation guide each have coordinated colors and icons", () => {
  for (const tier of ["vip", "premium", "bronze"]) {
    assert.match(css, new RegExp(`city-profile-section\\.tier-${tier}`));
    assert.match(css, new RegExp(`public-card-tier-badge\\.${tier}`));
    assert.match(css, new RegExp(`public-tag\\.${tier}`));
    assert.match(css, new RegExp(`tier-form-chip\\.tier-${tier}`));
  }
});
