// Loopback-only disposable QA. Never opens a remote database or sends email.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const base = "http://127.0.0.1:3880";
const fixture = JSON.parse(readFileSync("outputs/qa-account-stories.json", "utf8"));
assert.match(fixture.prefix, /^qa_stories_[a-f0-9]+$/);
const db = new DatabaseSync(".wrangler/visual-state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite");
const adminId = fixture.prefix + "_admin";
assert.ok(fixture.users.includes(adminId));
const grant = db.prepare("SELECT access_level FROM admin_github_access WHERE user_id=?").get(adminId);
const bugId = fixture.prefix + "_testers_bug";
const request = async (path, cookie = fixture.cookies.admin, options = {}) => {
  const response = await fetch(base + path, { ...options, redirect: "manual", signal: AbortSignal.timeout(30000), headers: { connection: "close", ...(cookie ? { cookie } : {}), ...options.headers } });
  const text = await response.text();
  // Redirects raised below a streamed layout may be delivered as an RSC
  // instruction with HTTP 200; they must contain no protected panel data.
  const streamedRedirect = text.match(/NEXT_REDIRECT;;([^\\"\s]+)/)?.[1];
  return { status: response.status, location: response.headers.get("location") ?? (streamedRedirect ? decodeURIComponent(streamedRedirect) : null), robots: response.headers.get("x-robots-tag"), cache: response.headers.get("cache-control"), text };
};
const location = response => { const url = new URL(response.location, base); return url.pathname + url.search; };

try {
  for (const path of ["/admin/testing", "/admin/testing?seccion=inicio"]) {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.match(response.robots, /noindex/);
    assert.match(response.cache, /no-store/);
    assert.match(response.text, /Testing/);
    const anonymous = await request(path, null);
    assert.ok(anonymous.location?.includes("/api/auth/github/start"));
    assert.doesNotMatch(anonymous.text, /testers-home-heading|testers-bugs-heading/);
    const normal = await request(path, fixture.cookies.owner);
    assert.ok(normal.location?.includes("/api/auth/github/start"));
    assert.doesNotMatch(normal.text, /testers-home-heading|testers-bugs-heading/);
  }
  const oldBug = await request("/admin/bugs?estado=resolved&notice=updated&next=https://evil.invalid");
  assert.ok([302, 303, 307].includes(oldBug.status));
  assert.equal(location(oldBug), "/admin/testing?seccion=bugs&estado=resolved&notice=updated");
  const oldHome = await request("/admin/configuracion/inicio?saved=1");
  assert.equal(location(oldHome), "/admin/testing?seccion=inicio&saved=1");
  assert.equal(location(await request("/admin/testers?seccion=tema&saved=1&next=//evil.invalid")), "/admin/testing?seccion=tema&saved=1");

  db.prepare("INSERT INTO bug_reports(id,reporter_id,title,description,page_url,device_type,status) VALUES(?,?,?,?,?,'desktop','new')").run(bugId, fixture.prefix + "_owner", "Reporte local de Testers", "Comprobar respuesta y filtro de estado.", base + "/mi-cuenta");
  const reply = await request("/api/bugs/" + bugId, fixture.cookies.admin, { method: "POST", headers: { origin: base }, body: new URLSearchParams({ body: "Respuesta local de comprobación.", status: "resolved" }) });
  assert.equal(reply.status, 303);
  assert.equal(location(reply), "/admin/testing?seccion=bugs&estado=resolved&notice=updated");
  assert.equal(db.prepare("SELECT status FROM bug_reports WHERE id=?").get(bugId).status, "resolved");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM bug_report_messages WHERE report_id=?").get(bugId).count, 1);
  const resolved = await request(location(reply));
  assert.equal(resolved.status, 200);
  assert.match(resolved.text, /Reporte local de Testers/);
  assert.match(resolved.text, /Respuesta local de comprobación/);

  db.prepare("UPDATE admin_github_access SET access_level='support' WHERE user_id=?").run(adminId);
  const support = await request("/admin/testing");
  assert.equal(support.status, 200);
  assert.match(support.text, /Reportes de errores/);
  assert.doesNotMatch(support.text, /<form[^>]+action="\/api\/admin\/settings"/);
  assert.equal(location(await request("/admin/testing?seccion=inicio")), "/admin/acceso-denegado?reason=permission");
  assert.equal(location(await request("/admin/testing?seccion=tema")), "/admin/acceso-denegado?reason=permission");
  assert.equal(location(await request("/admin/vista-previa-tema/liquid-glass")), "/admin/acceso-denegado?reason=permission");
  assert.equal(location(await request("/admin/vista-previa-inicio/compact")), "/admin/acceso-denegado?reason=permission");
  assert.equal((await request("/api/admin/settings", fixture.cookies.admin, { method: "POST", headers: { origin: base } })).status, 403);
  db.prepare("UPDATE admin_github_access SET access_level='editor' WHERE user_id=?").run(adminId);
  assert.equal(location(await request("/admin/testing")), "/admin/acceso-denegado?reason=permission");
  console.log("PASS Testers hub, legacy redirects, normal/anonymous denial, private noindex/no-store, bug replies, state filters, and role isolation.");
} finally {
  db.prepare("UPDATE admin_github_access SET access_level=? WHERE user_id=?").run(grant.access_level, adminId);
  db.prepare("DELETE FROM bug_report_messages WHERE report_id=?").run(bugId);
  db.prepare("DELETE FROM bug_reports WHERE id=?").run(bugId);
  db.close();
}
