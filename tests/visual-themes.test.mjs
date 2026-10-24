import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { HOME_LAYOUT_HEADER } from "../lib/home-layout-policy.ts";
import { GLASS_STYLESHEET, isVisualTheme, previewVisualTheme, readVisualTheme, VISUAL_THEME_HEADER } from "../lib/site-theme-policy.ts";
import { legacyTestingPath, settingsReturnPath, THEME_TESTING_PATH } from "../lib/admin-testing-policy.ts";
import { prepareSitePresentation } from "../worker/site-presentation.ts";
import { publicCacheKey } from "../worker/public-cache.ts";
const source = path => readFile(new URL("../" + path, import.meta.url), "utf8");

test("visual themes are a finite independent setting with the current look as the default", () => {
  for (const theme of ["classic", "liquid-glass"]) { assert.ok(isVisualTheme(theme)); assert.equal(readVisualTheme(theme), theme); }
  for (const value of ["glass", undefined, null, [], "__proto__", "liquid-glass&home=compact"]) { assert.equal(readVisualTheme(value), "classic"); assert.equal(isVisualTheme(value), false); }
  assert.equal(previewVisualTheme("/admin/vista-previa-tema/liquid-glass"), "liquid-glass");
  for (const path of ["/?theme=liquid-glass", "/admin/vista-previa-tema/unknown", "/perfil/liquid-glass"]) assert.equal(previewVisualTheme(path), null);
});

test("one settings read pins theme and home; forged headers are removed and APIs/media do no presentation queries", async () => {
  let reads = 0;
  const db = { prepare(sql) { assert.match(sql, /LIMIT 3/); return { bind(...keys) { assert.deepEqual(keys, ["home_layout", "visual_theme"]); return { async all() { reads++; return { results: [{ key: "home_layout", value: "compact" }, { key: "visual_theme", value: "liquid-glass" }] }; } }; } }; } };
  const forged = { [VISUAL_THEME_HEADER]: "classic", [HOME_LAYOUT_HEADER]: "classic" };
  const home = await prepareSitePresentation(new Request("https://example.test/", { headers: forged }), db);
  assert.equal(reads, 1); assert.equal(home.theme, "liquid-glass"); assert.equal(home.layout, "compact");
  assert.equal(home.request.headers.get(VISUAL_THEME_HEADER), "liquid-glass");
  for (const path of ["/api/admin/settings", "/api/auth/session/state", "/media/image", "/assets/theme.css", "/robots.txt", "/sitemap.xml", "/historias/story/media"]) {
    const value = await prepareSitePresentation(new Request("https://example.test" + path, { headers: forged }), db);
    assert.equal(value.page, false); assert.equal(value.request.headers.get(VISUAL_THEME_HEADER), null); assert.equal(value.request.headers.get(HOME_LAYOUT_HEADER), null);
  }
  assert.equal(reads, 1);
  const preview = await prepareSitePresentation(new Request("https://example.test/admin/vista-previa-tema/classic"), db);
  assert.equal(preview.theme, "classic");
  assert.equal((await prepareSitePresentation(new Request("https://example.test/"))).theme, "classic");
});

test("cache variants separate both themes on every shareable page and ignore caller-selected cache parameters", () => {
  for (const path of ["/", "/perfil/@lalita", "/quienes-somos", "/noticias"]) {
    const request = new Request("https://example.test" + path + "?__chile3x_theme=liquid-glass");
    const classic = publicCacheKey(request, "deploy", new Set(), "classic", "classic");
    const glass = publicCacheKey(request, "deploy", new Set(), "classic", "liquid-glass");
    assert.notEqual(classic.url, glass.url);
    assert.equal(new URL(classic.url).searchParams.get("__chile3x_theme"), "classic");
    assert.equal(new URL(glass.url).searchParams.get("__chile3x_theme"), "liquid-glass");
    assert.equal(publicCacheKey(request, "deploy", new Set(), "classic", "invalid").url, classic.url);
  }
  assert.equal(publicCacheKey(new Request("https://example.test/admin/vista-previa-tema/liquid-glass")), null);
});

test("only the active theme stylesheet is emitted server-side; there is no client theme loader or global glass import", async () => {
  const layout = await source("app/layout.tsx");
  assert.match(layout, /<html lang="es" data-visual-theme=\{theme\}/);
  assert.match(layout, /theme === "liquid-glass" && <link rel="stylesheet" href=\{GLASS_STYLESHEET\}/);
  assert.doesNotMatch(layout, /import .*theme-liquid-glass|localStorage|useEffect/);
  assert.match(GLASS_STYLESHEET, /^\/assets\/theme-liquid-glass-\d{8}(?:-v\d+)?\.css$/);
  const css = await source("public" + GLASS_STYLESHEET);
  assert.ok(Buffer.byteLength(css) < 14000);
  assert.doesNotMatch(css, /@import|@font-face|url\(|filter:\s*url|animation:/);
  assert.match(css, /select:disabled/);
  assert.match(css, /prefers-reduced-transparency/);
  assert.match(css, /forced-colors:active/);
  assert.match(css, /font-weight:400 !important/);
});

test("Testing redirects are internal and preserve only known tabs/filters; theme cannot publish via a preview", async () => {
  assert.equal(settingsReturnPath(THEME_TESTING_PATH), THEME_TESTING_PATH);
  assert.equal(legacyTestingPath(new URLSearchParams("seccion=tema&saved=1&next=//evil.invalid")), THEME_TESTING_PATH + "&saved=1");
  assert.equal(legacyTestingPath(new URLSearchParams("estado=resolved&notice=updated")), "/admin/testing?seccion=bugs&estado=resolved&notice=updated");
  const [preview, route, panel] = await Promise.all([source("app/admin/vista-previa-tema/[theme]/page.tsx"), source("app/api/admin/settings/route.ts"), source("app/admin/testing/VisualThemeSettingsPanel.tsx")]);
  assert.match(preview, /privatePageMetadata/); assert.match(preview, /adminHasCapability\(admin, "settings.manage"\)/);
  assert.ok(preview.indexOf("if (!admin)") < preview.indexOf("<HomeContent"));
  assert.doesNotMatch(preview, /getDb|onConflictDoUpdate/);
  assert.match(route, /getAll\("visual_theme"\).length !== 1/);
  assert.match(panel, /name="review_revision"/); assert.match(panel, /name="visual_theme"/);
  const exit = await source("app/admin/vista-previa-tema/PreviewDocumentNavigation.tsx");
  assert.match(preview, /<PreviewDocumentNavigation>/);
  assert.match(exit, /window.location.assign\(url.href\)/);
  assert.doesNotMatch(exit, /localStorage|useEffect|useState|fetch\(/);
});
