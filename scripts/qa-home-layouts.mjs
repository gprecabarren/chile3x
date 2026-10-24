// Integration checks against loopback-only disposable QA accounts. No remote D1.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const base = "http://127.0.0.1:3880";
const fixture = JSON.parse(readFileSync("outputs/qa-account-stories.json", "utf8"));
assert.match(fixture.prefix, /^qa_stories_[a-f0-9]+$/);
const settingsPath = "/admin/testing?seccion=inicio";
const request = (path, cookie, options = {}) => fetch(base + path, {
  ...options,
  redirect: "manual",
  signal: AbortSignal.timeout(30000),
  headers: { connection: "close", ...(cookie ? { cookie } : {}), ...options.headers },
});
const settings = async () => {
  const response = await request(settingsPath, fixture.cookies.admin);
  assert.equal(response.status, 200);
  const html = await response.text();
  const collaboration = await request("/api/admin/colaboracion?key=settings%3Asite", fixture.cookies.admin);
  assert.equal(collaboration.status, 200);
  const state = await collaboration.json();
  const revision = state.resources.find(item => item.key === "settings:site")?.revision?.toString();
  assert.ok(revision !== undefined, "revision must be present");
  const home = await request("/");
  const selected = home.headers.get("x-chile3x-home-layout");
  await home.text();
  assert.ok(selected, "one template must be selected");
  return { html, revision, active: selected };
};
const save = async (layout, revision, cookie = fixture.cookies.admin, origin = base, duplicate = false) => {
  const body = new URLSearchParams({ return_to: settingsPath, review_key: "settings:site", review_revision: revision, home_layout: layout });
  if (duplicate) body.append("home_layout", "classic");
  const response = await request("/api/admin/settings", cookie, { method: "POST", body, headers: { origin } });
  return { status: response.status, location: response.headers.get("location"), text: await response.text() };
};

const original = await settings();
assert.match(original.html, /Previsualizar/);
let changed = false;
try {
  const anonymous = await request("/admin/vista-previa-inicio/compact");
  assert.match(anonymous.headers.get("x-robots-tag") ?? "", /noindex/);
  assert.doesNotMatch(await anonymous.text(), /data-home-layout="compact"/);
  const preview = await request("/admin/vista-previa-inicio/compact", fixture.cookies.admin);
  const previewHtml = await preview.text();
  assert.equal(preview.status, 200);
  assert.match(preview.headers.get("x-robots-tag") ?? "", /noindex/);
  // Private pages use the existing browser-session setup before hydration;
  // their final interactive layout is checked separately in the browser.
  assert.match(previewHtml, /name="robots" content="[^"]*noindex/);
  assert.doesNotMatch(previewHtml, /type="application\/ld\+json"/);

  // These guards run before reading form data; an empty request is sufficient
  // and avoids Miniflare restarting a rejected, unread POST body in local QA.
  for (const [label, response, expected] of [
    ["normal account", await request("/api/admin/settings", fixture.cookies.owner, { method: "POST", headers: { origin: base } }), 401],
    ["cross origin", await request("/api/admin/settings", fixture.cookies.admin, { method: "POST", headers: { origin: "https://untrusted.invalid" } }), 403],
  ]) {
    assert.equal(response.status, expected, label);
    await response.text();
  }
  for (const [label, response, expected] of [
    ["unknown template", await save("unknown", original.revision), 400],
    ["duplicate choices", await save("compact", original.revision, fixture.cookies.admin, base, true), 400],
  ]) {
    if (response.status !== expected) console.error(label, response.text.slice(0, 500));
    assert.equal(response.status, expected, label);
  }
  const published = await save("compact", original.revision);
  assert.equal(published.status, 303);
  assert.equal(new URL(published.location, base).pathname + new URL(published.location, base).search, settingsPath + "&saved=1");
  changed = true;
  const home = await request("/", undefined, { headers: { "x-chile3x-home-layout": "classic" } });
  const homeHtml = await home.text();
  assert.equal(home.status, 200);
  assert.equal(home.headers.get("x-chile3x-home-layout"), "compact");
  assert.match(homeHtml, /data-home-layout="compact"/);
  assert.equal((homeHtml.match(/<h1\b/g) ?? []).length, 1);
  assert.match(homeHtml, /rel="canonical" href="https:\/\/chile3x\.cl\/"/);
  assert.doesNotMatch(homeHtml, /name="robots" content="[^"]*noindex/);
  const cityNav = homeHtml.split('id="home-city-directory-links"')[1]?.split("</nav>")[0];
  assert.ok(cityNav);
  for (const slug of ["iquique", "antofagasta", "calama", "caldera", "copiapo", "vallenar", "chillan"]) {
    assert.ok(cityNav.includes(`/escorts/${slug}`), slug);
  }
  assert.ok(cityNav.indexOf("/escorts/iquique") < cityNav.indexOf("/escorts/antofagasta"));
  assert.doesNotMatch(cityNav, /<h[1-6]|Región|home-city-region/);
  for (const section of ["home-profile-search", "home-photo-banner", "process-section", "announce-section"]) assert.ok(homeHtml.includes(section), section);
  const stale = await save("classic", original.revision);
  assert.equal(stale.status, 409, "stale administrator must not overwrite the current version");
  assert.equal((await settings()).active, "compact");
  console.log("PASS private previews, permissions, origin checks, selection, SSR/canonical, city order and concurrent edit protection.");
} finally {
  if (changed) {
    const current = await settings();
    const restored = await save(original.active, current.revision);
    assert.equal(restored.status, 303, "restore the prior local setting");
    assert.equal((await settings()).active, original.active);
    console.log("PASS restored the previous local homepage design.");
  }
}
