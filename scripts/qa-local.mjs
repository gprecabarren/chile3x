// Non-production integration checks. Uses only the local Wrangler SQLite DB.
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const base = "http://localhost:3000";
const database = resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject/57517e47ee4bded0b6657bc2537948a96d7c7d36cc7da324b304803924096a61.sqlite");
assert.ok(database.startsWith(resolve(".wrangler/state") + "/") || database.startsWith(resolve(".wrangler/state") + "\\"));
const db = new DatabaseSync(database);
db.exec("PRAGMA foreign_keys=ON");
mkdirSync("outputs", { recursive: true });
const manifestPath = "outputs/qa-local-fixtures.json";

if (process.argv[2] === "cleanup") {
  const { users, profileIds } = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.ok([...users, ...profileIds].every((id) => id.startsWith("qa_audit_")));
  db.exec("BEGIN");
  for (const id of profileIds) db.prepare("DELETE FROM profiles WHERE id = ?").run(id);
  db.prepare("DELETE FROM admin_github_access WHERE user_id IN (SELECT value FROM json_each(?))").run(JSON.stringify(users));
  for (const id of users) db.prepare("DELETE FROM users WHERE id = ?").run(id);
  db.exec("COMMIT");
  console.log("Only local QA fixtures removed.");
  process.exit(0);
}

const suffix = randomBytes(5).toString("hex");
const prefix = `qa_audit_${suffix}`;
const ids = Object.fromEntries(["admin", "owner", "tester", "empty", "disabled"].map((name) => [name, `${prefix}_${name}`]));
const expiration = new Date(Date.now() + 3600_000).toISOString();
const cookies = {};
for (const [name, id] of Object.entries(ids)) {
  db.prepare("INSERT INTO users (id,email,username,display_name,role,is_active,email_verified_at,city) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, `${id}@example.invalid`, `qa-${name}-${suffix}`, `Cuenta QA ${name}`, name === "admin" ? "admin" : name === "tester" ? "tester" : "advertiser", name === "disabled" ? 0 : 1, new Date().toISOString(), "Valdivia");
  const secret = randomBytes(24).toString("hex");
  const sessionId = `${prefix}_${name}_session`;
  db.prepare("INSERT INTO auth_sessions (id,user_id,token_hash,auth_method,ip_address,user_agent,country_code,region,city,timezone,last_seen_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(sessionId, id, createHash("sha256").update(secret).digest("hex"), name === "admin" ? "github" : "password", "203.0.113.42", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36", "CL", "Los Ríos", "Valdivia", "America/Santiago", new Date().toISOString(), expiration);
  const cookieName = name === "admin" ? "chile3x_admin_session" : "chile3x_user_session";
  cookies[name] = `${cookieName}=${sessionId}.${secret}`;
  if (["admin", "tester", "owner"].includes(name)) {
    writeFileSync(`outputs/qa-${name}-state.json`, JSON.stringify({ cookies: [{ name: cookieName, value: `${sessionId}.${secret}`, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 3600 }], origins: [] }));
  }
}
db.prepare("INSERT INTO admin_github_access (id,github_login,github_user_id,user_id,access_level,protected_email,is_active) VALUES (?,?,?,?,?,?,1)")
  .run(`${prefix}_admin_grant`, `qa-admin-${suffix}`, `${Date.now()}`, ids.admin, "administrator", `${ids.admin}@example.invalid`);

const profileId = `${prefix}_profile`;
const disabledProfileId = `${prefix}_disabled_profile`;
for (const [id, owner, slug] of [[profileId, ids.owner, `qa-activo-${suffix}`], [disabledProfileId, ids.disabled, `qa-deshabilitado-${suffix}`]]) {
  db.prepare("INSERT INTO profiles(id,owner_id,type,status,slug,handle,display_name,region,city,is_featured) VALUES(?,?,?,?,?,?,?,?,?,?)")
    .run(id, owner, "escort", "approved", slug, slug, slug, "Región de Los Ríos", "Valdivia", 1);
}
db.prepare("INSERT INTO profile_statuses(id,profile_id,body,expires_at) VALUES(?,?,?,?)").run(`${prefix}_story`, profileId, `QA-HISTORIA-${suffix}`, expiration);
for (let index = 0; index < 21; index++) {
  db.prepare("INSERT INTO reviews(id,author_id,profile_id,body,status,created_at) VALUES(?,?,?,?,?,?)")
    .run(`${prefix}_review_${String(index).padStart(2, "0")}`, ids.tester, profileId, `Reseña QA ${index}`, "approved", "2026-01-01 12:00:00");
}
writeFileSync(manifestPath, JSON.stringify({ users: Object.values(ids), profileIds: [profileId, disabledProfileId], ids, profileId, suffix }));

async function get(path, name, options = {}) {
  return fetch(new URL(path, base), { ...options, redirect: "manual", headers: { accept: "text/html", ...(name ? { cookie: cookies[name] } : {}), ...options.headers } });
}
async function checkPage(path, name, includes) {
  const response = await get(path, name);
  const body = await response.text();
  assert.equal(response.status, 200, `${path}: ${response.status} ${body.slice(0, 100)}`);
  if (includes) assert.ok(body.includes(includes), `${path} missing ${includes}`);
  assert.doesNotMatch(body, /Worker threw exception|Worker exceeded resource limits/);
  console.log(`PASS ${name ?? "anonymous"} ${path}`);
  return body;
}

await checkPage(`/admin/cuentas/${ids.empty}/crear-perfil`, "admin", '<form');
const existingOwnerForm = await checkPage(`/admin/cuentas/${ids.owner}/crear-perfil`, "admin", '<form');
assert.ok(!existingOwnerForm.includes('<option value="escort"'), "A second escort must not be offered");
const missing = await get(`/admin/cuentas/${prefix}_missing/crear-perfil`, "admin");
assert.ok([302, 303, 307].includes(missing.status));
const adminSummary = await checkPage("/admin", "admin", "Panel operativo");
assert.ok(adminSummary.includes("Sesiones y dispositivos"));
assert.ok(adminSummary.includes("203.0.113.42"));
for (const path of ["/admin/cuentas?page=2", "/admin/perfiles?page=2", "/admin/medios", "/admin/configuracion"]) await checkPage(path, "admin");
for (const name of ["owner", "tester"]) {
  const accountSummary = await checkPage("/mi-cuenta", name, "Sesiones y dispositivos");
  assert.ok(accountSummary.includes("203.0.113.42"));
  for (const path of ["/mi-cuenta/datos-personales", "/mi-cuenta/contenido", "/mi-cuenta/nuevo-perfil"]) await checkPage(path, name);
}
const home = await checkPage("/", "tester", `qa-tester-${suffix}`);
assert.ok(home.includes("Se priorizan las escorts con más visualizaciones únicas recientes"), "signed-in users should see the featured-profile explanation");
assert.ok(!home.includes('href="/registro"'), "signed-in home must hide registration");
const anonymous = await checkPage("/");
assert.ok(!anonymous.includes("Se priorizan las escorts con más visualizaciones únicas recientes"), "anonymous visitors must not see the internal ranking explanation");
assert.ok(!anonymous.includes("Los perfiles destacados aparecerán aquí"), "anonymous visitors must not see the internal empty-state explanation");
assert.ok(!anonymous.includes(ids.tester), "session identity must never leak to anonymous home");
assert.ok(!anonymous.includes(`qa-deshabilitado-${suffix}`), "disabled accounts must not be promoted");
assert.equal((await get(`/perfil/qa-deshabilitado-${suffix}`)).status, 404);
assert.equal((await get(`/api/perfiles/${disabledProfileId}/resenas`)).status, 404);
const reviewIds = [];
for (let page = 1; page <= 3; page++) {
  const data = await (await get(`/api/perfiles/${profileId}/resenas?page=${page}`)).json();
  assert.equal(data.total, 21);
  reviewIds.push(...data.reviews.map((review) => review.id));
  assert.equal(data.hasMore, page < 3);
}
assert.equal(new Set(reviewIds).size, 21, "all reviews must remain accessible, without repeated page rows");
console.log("PASS reviews: 21/21 across 3 pages with identical timestamps");
db.prepare("INSERT INTO blocked_profiles(id,user_id,profile_id) VALUES(?,?,?)").run(`${prefix}_blocked`, ids.tester, profileId);
const blockedHome = await checkPage("/", "tester");
assert.ok(!blockedHome.includes(`qa-activo-${suffix}`), "hidden listing must stay out of featured cards and stories");
assert.ok(!blockedHome.includes(`QA-HISTORIA-${suffix}`), "hidden story must not leak in RSC props");
const failedLogin = await get("/api/auth/login", null, { method: "POST", headers: { origin: base, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ email: "test@example.invalid", password: "not-a-password", return_to: "/mi-cuenta/nuevo-perfil" }) });
assert.equal(new URL(failedLogin.headers.get("location")).searchParams.get("return_to"), "/mi-cuenta/nuevo-perfil");
const csrf = await get("/api/auth/session/logout", "owner", { method: "POST", headers: { origin: "https://other.invalid" } });
assert.equal(csrf.status, 403);
const otherSessionId = `${prefix}_owner_other_session`;
db.prepare("INSERT INTO auth_sessions (id,user_id,token_hash,auth_method,ip_address,expires_at) VALUES (?,?,?,?,?,?)")
  .run(otherSessionId, ids.owner, createHash("sha256").update(randomBytes(24).toString("hex")).digest("hex"), "google", "198.51.100.25", expiration);
const revokeOther = await get("/api/mi-cuenta/sesiones", "owner", { method: "POST", headers: { origin: base, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ action: "revoke_one", session_id: otherSessionId }) });
assert.equal(revokeOther.status, 303);
assert.equal(db.prepare("SELECT count(*) as n FROM auth_sessions WHERE id=?").get(otherSessionId).n, 0);
const logout = await get("/api/auth/session/logout", "owner", { method: "POST", headers: { origin: base } });
assert.equal(logout.status, 303);
assert.match(logout.headers.get("set-cookie"), /Max-Age=0/i);
assert.equal(db.prepare("SELECT count(*) as n FROM auth_sessions WHERE user_id=?").get(ids.owner).n, 0);
assert.ok(!((await (await get("/", "owner")).text()).includes(ids.owner)), "old session cannot authenticate after logout");
console.log("PASS session summaries, ownership-scoped revocation, cross-origin protection and logout");
console.log("QA fixtures remain local for visual checks; run node scripts/qa-local.mjs cleanup afterwards.");
