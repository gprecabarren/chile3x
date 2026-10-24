// Exercises only the loopback Worker and disposable local QA identities.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(readFileSync("outputs/qa-account-stories.json", "utf8"));
assert.match(fixture.prefix, /^qa_stories_[a-f0-9]+$/);
const base = "http://127.0.0.1:3880";
const request = async (path, cookie, options = {}) => {
  const response = await fetch(base + path, { ...options, redirect: "manual", signal: AbortSignal.timeout(30000), headers: { connection: "close", ...(cookie ? { cookie } : {}), ...options.headers } });
  return { status: response.status, headers: response.headers, text: await response.text() };
};
const revision = async () => {
  const response = await request("/api/admin/colaboracion?key=settings%3Asite", fixture.cookies.admin);
  assert.equal(response.status, 200);
  return JSON.parse(response.text).resources.find(row => row.key === "settings:site").revision.toString();
};
const save = async (values, version, duplicate = false) => {
  const data = new URLSearchParams({ return_to: "/admin/testing?seccion=tema", review_key: "settings:site", review_revision: version, ...values });
  if (duplicate) data.append("visual_theme", "classic");
  return request("/api/admin/settings", fixture.cookies.admin, { method: "POST", body: data, headers: { origin: base } });
};
const initial = await request("/");
const previous = { visual_theme: initial.headers.get("x-chile3x-visual-theme"), home_layout: initial.headers.get("x-chile3x-home-layout") };
assert.ok(previous.visual_theme && previous.home_layout);
let changed = false;
try {
  let version = await revision();
  assert.equal((await save({ visual_theme: "unknown" }, version)).status, 400);
  assert.equal((await save({ visual_theme: "liquid-glass" }, version, true)).status, 400);
  for (const theme of ["classic", "liquid-glass"]) {
    version = await revision();
    const result = await save({ visual_theme: theme }, version);
    assert.equal(result.status, 303); changed = true;
    assert.equal(new URL(result.headers.get("location")).pathname + new URL(result.headers.get("location")).search, "/admin/testing?seccion=tema&saved=1");
    for (const [path, cookie] of [["/", null], ["/escorts", null], ["/perfil/@" + fixture.prefix + "_escort", null], ["/mi-cuenta", fixture.cookies.owner], ["/admin/testing?seccion=tema", fixture.cookies.admin]]) {
      const page = await request(path, cookie, { headers: { "x-chile3x-visual-theme": theme === "classic" ? "liquid-glass" : "classic" } });
      assert.equal(page.status, 200, path);
      assert.equal(page.headers.get("x-chile3x-visual-theme"), theme, path);
      assert.ok(page.text.includes(`data-visual-theme="${theme}"`), path);
      assert.equal(page.text.includes('data-theme-stylesheet="liquid-glass"'), theme === "liquid-glass", path);
      if (theme === "classic") assert.doesNotMatch(page.text, /<link[^>]+theme-liquid-glass/);
    }
    assert.equal((await save({ visual_theme: theme }, version)).status, 409, "stale theme update must not overwrite another administrator");
    for (const previewTheme of ["classic", "liquid-glass"]) {
      const preview = await request("/admin/vista-previa-tema/" + previewTheme, fixture.cookies.admin);
      assert.equal(preview.status, 200);
      assert.match(preview.headers.get("x-robots-tag"), /noindex/);
      assert.ok(preview.text.includes(`data-visual-theme="${previewTheme}"`));
      assert.equal(preview.text.includes('data-theme-stylesheet="liquid-glass"'), previewTheme === "liquid-glass");
      assert.doesNotMatch(preview.text, /type="application\/ld\+json"/);
    }
    assert.equal((await request("/")).headers.get("x-chile3x-visual-theme"), theme, "preview must not publish");
  }
  for (const home_layout of ["classic", "compact"]) {
    const saved = await save({ home_layout }, await revision()); assert.equal(saved.status, 303);
    const page = await request("/");
    assert.equal(page.headers.get("x-chile3x-home-layout"), home_layout);
    assert.equal(page.headers.get("x-chile3x-visual-theme"), "liquid-glass");
    assert.equal((page.text.match(/<h1\b/g) ?? []).length, 1);
    assert.match(page.text, /rel="canonical" href="https:\/\/chile3x\.cl\/"/);
  }
  console.log("PASS both themes across public/account/admin pages, conditional CSS, forged headers, private previews, reversible saving, conflict protection and independent home layouts.");
} finally {
  if (changed) {
    assert.equal((await save(previous, await revision())).status, 303);
    assert.equal((await request("/")).headers.get("x-chile3x-visual-theme"), previous.visual_theme);
    console.log("PASS restored the previous local theme and home layout.");
  }
}
