import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("home quick selector groups configured cities under non-clickable regions", async () => {
  const [selector, home] = await Promise.all([source("app/HomeLocationSummary.tsx"), source("app/page.tsx")]);
  assert.match(selector, /aria-expanded=\{selectorOpen\} aria-controls=\{selectorOpen \? "home-city-selector" : undefined\}/);
  assert.match(selector, /regions\.filter\(\(region\) => region\.cities\.length > 0\)/);
  assert.match(selector, /<h3>\{region\.displayTitle\}<\/h3>/);
  assert.match(selector, /<Link key=\{city\.citySlug\} href=\{`\/escorts\/\$\{city\.citySlug\}`\}/);
  assert.match(selector, /onClick=\{\(\) => savePreferredCity\(city\.citySlug\)\}/);
  assert.match(home, /<HomeLocationSummary/);
});

test("public directory filters and limits IDs in D1 before hydrating media", async () => {
  const directory = await source("lib/directory.ts");
  for (const expression of ["publicProfileCondition", "blockedProfiles.userId", "filters.region", "filters.city", "filters.type", "filters.tier", "filters.online", "filters.verified", "filters.name", "filters.tags", "filters.servicesIncluded", "filters.servicesAdditional", "filters.ageMin", "filters.ageMax"]) {
    assert.ok(directory.slice(directory.indexOf("export async function getPublicProfilePage"), directory.indexOf("export async function getPublicProfileSitemapRows")).includes(expression), expression);
  }
  assert.match(directory, /\.limit\(DIRECTORY_PAGE_SIZE \+ 1\)\.offset\(\(page - 1\) \* DIRECTORY_PAGE_SIZE\)/);
  assert.match(directory, /getPublicProfiles\(\{ profileIds: pageIds\.map/);
  assert.doesNotMatch(directory.slice(directory.indexOf("export async function getPublicProfilePage"), directory.indexOf("export async function getPublicProfileSitemapRows")), /count\(\)/);
});

test("sitemap fetches only public path fields, without profile media hydration", async () => {
  const [directory, sitemap] = await Promise.all([source("lib/directory.ts"), source("app/sitemap.ts")]);
  const helper = directory.slice(directory.indexOf("export async function getPublicProfileSitemapRows"), directory.indexOf("const getPublicProfileForRouteCached"));
  assert.match(helper, /slug: profiles\.slug, handle: profiles\.handle, updatedAt: profiles\.updatedAt/);
  assert.match(helper, /publicProfileCondition/);
  assert.match(helper, /eq\(profiles\.isDemo, false\)/);
  assert.doesNotMatch(helper, /profileMedia|profileTags|getPublicProfiles/);
  assert.match(sitemap, /getPublicProfileSitemapRows\(\)/);
  assert.doesNotMatch(sitemap, /getPublicProfiles\(/);
});

test("public-page index is partial and limited to approved visible listings", async () => {
  const [schema, migration] = await Promise.all([source("db/schema.ts"), source("drizzle/0038_sturdy_slipstream.sql")]);
  assert.match(schema, /profiles_public_directory_page_idx/);
  assert.match(migration, /CREATE INDEX `profiles_public_directory_page_idx`/);
  assert.match(migration, /status" = 'approved' and "profiles"\."owner_hidden_at" is null and "profiles"\."trashed_at" is null/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|UPDATE profiles/);
});
