import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Sitios asociados has ordered D1 groups and R2-backed cards", async () => {
  const [schema, migration, storage, media] = await Promise.all([
    source("db/schema.ts"),
    source("drizzle/0030_brave_falcon.sql"),
    source("app/api/admin/operaciones/almacenamiento/route.ts"),
    source("lib/media.ts"),
  ]);
  assert.match(schema, /sponsorGroups = sqliteTable\("sponsor_groups"/);
  assert.match(schema, /sponsors = sqliteTable\("sponsors"/);
  assert.match(schema, /backgroundR2Key: text\("background_r2_key"\)\.notNull\(\)\.unique\(\)/);
  assert.match(schema, /displayMode: text\("display_mode", \{ enum: \["overlay", "image", "brand"\] \}\)/);
  const secondMigration = await source("drizzle/0031_lowly_changeling.sql");
  assert.equal((migration.match(/\('sponsor_[a-z_]+','sponsor_group_chile'/g) ?? []).length + (secondMigration.match(/\('sponsor_[a-z_]+','sponsor_group_chile'/g) ?? []).length, 11);
  assert.doesNotMatch(`${migration}\n${secondMigration}`, /sponsor_paradisse|https:\/\/paradisse\.cl/);
  assert.match(storage, /sponsors\.backgroundR2Key/);
  assert.match(storage, /sponsors\.logoR2Key/);
  assert.match(media, /sponsors\.backgroundByteSize/);
  assert.match(media, /sponsors\.logoByteSize/);
});

test("the admin module provides visibility, groups, ordering, CRUD and image replacement", async () => {
  const [page, createCard, updateCard, groups, visibility] = await Promise.all([
    source("app/admin/patrocinadores/page.tsx"),
    source("app/api/admin/patrocinadores/route.ts"),
    source("app/api/admin/patrocinadores/[sponsorId]/route.ts"),
    source("app/api/admin/patrocinadores/grupos/[groupId]/route.ts"),
    source("app/api/admin/patrocinadores/visibilidad/route.ts"),
  ]);
  assert.match(page, /Orden vertical/);
  assert.match(page, /Orden horizontal/);
  assert.match(page, /multipart\/form-data/);
  assert.match(page, /Enlace pagado o patrocinado/);
  assert.match(page, /Título visible \(opcional\)/);
  assert.match(page, /sponsor-cta-options/);
  for (const route of [createCard, updateCard, groups, visibility]) {
    assert.match(route, /assertSameOrigin/);
    assert.match(route, /adminHasCapability\(admin, "settings\.manage"\)/);
  }
  assert.match(updateCard, /confirm_delete/);
  assert.match(updateCard, /deleteSponsorImages/);
  assert.match(groups, /group-not-empty/);
});

test("the public page is canonical, structured, conditional and responsive", async () => {
  const [page, menu, shell, sitemap, typo, styles, mediaRoute] = await Promise.all([
    source("app/patrocinadores/page.tsx"),
    source("app/directorio/PublicMobileMenu.tsx"),
    source("app/directorio/_components.tsx"),
    source("app/sitemap.ts"),
    source("app/patrocioandores/page.tsx"),
    source("app/globals.css"),
    source("app/patrocinadores/media/[sponsorId]/[kind]/route.ts"),
  ]);
  assert.match(page, /path: "\/patrocinadores"/);
  assert.match(page, /"@type": "CollectionPage"/);
  assert.match(page, /<h1>Sitios asociados/);
  assert.match(page, /<h2 id=/);
  assert.match(page, /robots: enabled \? \{ index: true/);
  assert.match(page, /if \(!enabled && !admin\) notFound\(\)/);
  assert.match(menu, /showSponsors && <Link href="\/patrocinadores"/);
  assert.match(shell, /showSponsors && <Link href="\/patrocinadores"/);
  assert.match(sitemap, /sponsors_enabled === "enabled"/);
  assert.match(typo, /permanentRedirect\("\/patrocinadores"\)/);
  assert.match(styles, /\.sponsor-card-grid \{ display: grid/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.sponsor-card-grid \{ grid-template-columns: 1fr/);
  assert.match(mediaRoute, /publiclyVisible/);
  assert.match(mediaRoute, /private, no-store/);
});
