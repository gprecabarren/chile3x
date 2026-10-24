import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { HOME_LAYOUTS, HOME_LAYOUT_HEADER, isHomeLayout, readHomeLayout } from "../lib/home-layout-policy.ts";
import { prepareSitePresentation } from "../worker/site-presentation.ts";
import { publicCacheKey } from "../worker/public-cache.ts";

const source = path => readFile(new URL("../" + path, import.meta.url), "utf8");

test("only two home templates are accepted and an absent setting preserves the classic home", () => {
  assert.deepEqual(HOME_LAYOUTS, ["classic", "compact"]);
  for (const value of HOME_LAYOUTS) { assert.ok(isHomeLayout(value)); assert.equal(readHomeLayout(value), value); }
  for (const value of [undefined, null, "", "preview", "COMPACT", ["compact"]]) {
    assert.equal(isHomeLayout(value), false);
    assert.equal(readHomeLayout(value), "classic");
  }
});

test("the Worker pins SSR to the stored template and strips spoofed selection headers", async () => {
  let reads = 0;
  const database = { prepare(sql) {
    assert.match(sql, /WHERE key IN \(\?, \?\).*UNION ALL.*settings_revision.*LIMIT 3/);
    return { bind(key, themeKey) { assert.equal(key, "home_layout"); assert.equal(themeKey, "visual_theme"); return { async all() { reads++; return { results: [{ key: "home_layout", value: "compact" },{key:"content_revision",value:"17"}] }; } }; } };
  } };
  const home = await prepareSitePresentation(new Request("https://example.test/", { headers: { [HOME_LAYOUT_HEADER]: "classic" } }), database);
  assert.equal(home.layout, "compact");
  assert.equal(home.contentRevision,"17");
  assert.equal(home.request.headers.get(HOME_LAYOUT_HEADER), "compact");
  assert.equal(reads, 1);
  const other = await prepareSitePresentation(new Request("https://example.test/admin/vista-previa-inicio/compact", { headers: { [HOME_LAYOUT_HEADER]: "compact" } }), database);
  assert.equal(other.request.headers.get(HOME_LAYOUT_HEADER), null);
  assert.equal(reads, 2);
  const absent = await prepareSitePresentation(new Request("https://example.test/", { headers: { [HOME_LAYOUT_HEADER]: "compact" } }));
  assert.equal(absent.layout, "classic");
});

test("switching and rolling back templates selects distinct anonymous cache entries", () => {
  const request = new Request("https://example.test/?__chile3x_home=compact");
  const key = layout => publicCacheKey(request, "deployment", new Set(), layout);
  assert.notEqual(key("classic").url, key("compact").url);
  assert.equal(new URL(key("classic").url).searchParams.get("__chile3x_home"), "classic");
  assert.equal(key("classic").url, key(undefined).url);
  assert.equal(publicCacheKey(new Request("https://example.test/admin/vista-previa-inicio/compact")), null);
});

test("settings reuse authorization, origin checks, guarded writes and audit trails", async () => {
  const [route, page, settings] = await Promise.all([source("app/api/admin/settings/route.ts"), source("app/admin/testing/HomeLayoutSettingsPanel.tsx"), source("lib/site-settings.ts")]);
  for (const expression of ["assertSameOrigin(request)", 'adminHasCapability(admin, "settings.manage")', "HOME_LAYOUTS", "guardedBatch", "expectedVersion", "recordAdminAudit"]) assert.ok(route.includes(expression), expression);
  assert.match(route, /getAll\("home_layout"\)\.length !== 1/);
  assert.match(settings, /home_layout: "classic"/);
  assert.match(page, /type="radio" name="home_layout"/);
  assert.match(page, /name="review_key" value="settings:site"/);
  assert.match(page, /name="review_revision"/);
  assert.match(page, /Previsualizar/);
  assert.doesNotMatch(page, /fetch\(|useEffect/);
});

test("previews authorize before rendering and never publish a template", async () => {
  const page = await source("app/admin/vista-previa-inicio/[layout]/page.tsx");
  assert.match(page, /privatePageMetadata/);
  assert.match(page, /if \(!admin\) redirect\("\/admin"\)/);
  assert.match(page, /adminHasCapability\(admin, "settings.manage"\)/);
  assert.ok(page.indexOf("if (!admin)") < page.indexOf("<HomeContent"));
  assert.match(page, /if \(!isHomeLayout\(layout\)\) notFound\(\)/);
  assert.match(page, /<HomeContent layout=\{layout\} preview/);
  assert.doesNotMatch(page, /getDb|POST|form action|onConflictDoUpdate/);
});

test("the alternative changes presentation only, retaining one H1 and the shared lower sections", async () => {
  const [home, city, page] = await Promise.all([source("app/HomeContent.tsx"), source("app/HomeCityDirectory.tsx"), source("app/page.tsx")]);
  assert.equal((home.match(/<h1\b/g) ?? []).length, 1);
  for (const name of ["ProfileGrid", "StoryRail", "home-photo-banner", "process-section", "announce-section", "PublicFooter"]) assert.ok(home.includes(name), name);
  assert.match(home, /compact \? <HomeCityDirectory/);
  assert.match(home, /!preview &&/);
  assert.match(page, /canonical:\s*"\/"/);
  assert.doesNotMatch(page, /searchParams|user-agent|noindex/);
  assert.match(city, /href=\{`\/escorts\/\$\{city.citySlug\}`\}/);
  assert.match(city, /savePreferredCity\(city.citySlug\)/);
  assert.match(city, /aria-controls="home-city-directory-links"/);
  assert.doesNotMatch(city, /geolocation|navigator\.language|fetch\(/);
});
