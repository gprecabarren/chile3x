import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { DAY_MS, emailVerificationDeadline, emailVerificationState, emailVerificationTrashDue } from "../lib/email-verification-policy.ts";
import { privacyRegionAtPoint, validPrivacyRegions } from "../lib/face-privacy.ts";
const source = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const url = path => JSON.stringify(new URL(`../${path}`, import.meta.url).href);
const stubMail = `data:text/javascript,export async function createAccountToken(id){return 'test-token.'+id} export async function sendAccountEmail(data){globalThis.__graceMail.calls.push(data);return globalThis.__graceMail.delivered}`;
const stubAuth = `data:text/javascript,export async function sha256(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('')}`;
const workerSource = (await source("worker/email-verification.ts"))
  .replace('"../lib/email-verification-policy"', url("lib/email-verification-policy.ts"))
  .replace('"../lib/account-email"', JSON.stringify(stubMail))
  .replace('"../lib/auth"', JSON.stringify(stubAuth));
const { enforceEmailVerification, handleEmailVerificationScheduled, trashLongBlockedProfiles, verificationGuardExemptPath } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(workerSource)).toString("base64")}`);

function localDb() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`CREATE TABLE users(id TEXT PRIMARY KEY, email TEXT, display_name TEXT, password_hash TEXT, creation_source TEXT DEFAULT 'self', role TEXT DEFAULT 'advertiser', is_active INTEGER DEFAULT 1, email_verified_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE account_apple_identities(user_id TEXT); CREATE TABLE account_google_identities(user_id TEXT);
    CREATE TABLE profiles(id TEXT PRIMARY KEY, owner_id TEXT, display_name TEXT, type TEXT, status TEXT, trashed_at TEXT, trashed_by_kind TEXT, trashed_by_actor_id TEXT, trashed_by_admin_login TEXT, updated_at TEXT);
    CREATE TABLE auth_sessions(id TEXT PRIMARY KEY, user_id TEXT, token_hash TEXT, expires_at TEXT);
    CREATE TABLE admin_audit_logs(id TEXT PRIMARY KEY, actor_email TEXT, actor_name TEXT, category TEXT, action TEXT, outcome TEXT, entity_type TEXT, entity_id TEXT, entity_label TEXT, summary TEXT, after_data TEXT);`);
  const wrap = (statement, params = []) => ({ bind: (...values) => wrap(statement, values), all: async () => ({results: statement.all(...params)}), first: async () => statement.get(...params) ?? null, run: async () => ({success:true,meta:statement.run(...params)}) });
  const binding = { prepare: sql => wrap(sqlite.prepare(sql)), batch: async statements => {
    sqlite.exec("BEGIN"); try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec("COMMIT"); return result; } catch(error) {sqlite.exec("ROLLBACK"); throw error;}
  } };
  return { sqlite, binding };
}
async function migrate(sqlite) { sqlite.exec(await source("drizzle/0041_email_verification_grace.sql")); }
function addAccount(sqlite, id, deadline, extra={}) {
  sqlite.prepare("INSERT INTO users(id,email,display_name,created_at,email_verification_deadline,email_verified_at,email_verification_exempt_at,role) VALUES (?,?,?,?,?,?,?,?)").run(id,`${id}@example.invalid`,id,"2026-01-01 00:00:00",deadline,extra.verified ?? null,extra.exempt ?? null,extra.role ?? "advertiser");
  for (const type of ["escort","agency","rental"]) sqlite.prepare("INSERT INTO profiles(id,owner_id,display_name,type,status) VALUES (?,?,?,?,?)").run(`${id}_${type}`,id,id,type,"approved");
}

test("7-day grace uses UTC and cannot be extended by login, resend or local timezone", () => {
  const account={role:"advertiser",createdAt:"2026-10-09 00:00:00"};
  const deadline=Date.parse("2026-10-16T00:00:00Z");
  assert.equal(emailVerificationDeadline(account),deadline);
  assert.equal(emailVerificationState(account,deadline-1),"grace"); assert.equal(emailVerificationState(account,deadline),"blocked");
  assert.equal(emailVerificationTrashDue(account,deadline+31*DAY_MS-1),false);
  assert.equal(emailVerificationTrashDue(account,deadline+31*DAY_MS),true);
  assert.equal(emailVerificationState({...account,emailVerifiedAt:"ok"},deadline+99*DAY_MS),"verified");
  assert.equal(emailVerificationState({...account,emailVerificationExemptAt:"ok"},deadline+99*DAY_MS),"exempt");
  assert.equal(emailVerificationTrashDue({...account,emailVerificationExemptAt:"ok"},deadline+99*DAY_MS),false);
});

test("migration grants existing pending accounts 7 new days and leaves verified accounts untouched", async () => {
  const {sqlite}=localDb(); try {
    sqlite.exec("INSERT INTO users(id,email,created_at) VALUES ('old','old@example.invalid','2020-01-01'); INSERT INTO users(id,email,email_verified_at) VALUES ('ok','ok@example.invalid','2020-01-01')");
    const before=Date.now(); await migrate(sqlite);
    const deadline=Date.parse(sqlite.prepare("SELECT email_verification_deadline d FROM users WHERE id='old'").get().d);
    assert.ok(deadline >= before+7*DAY_MS-1000 && deadline<=Date.now()+7*DAY_MS+1000);
    assert.equal(sqlite.prepare("SELECT email_verification_deadline d FROM users WHERE id='ok'").get().d,null);
  } finally {sqlite.close();}
});

test("31 days means since blocking, and all listing types are recoverable without deleting photos/status", async () => {
  const {sqlite,binding}=localDb(); try {
    await migrate(sqlite); const now="2026-10-09T12:00:00Z";
    addAccount(sqlite,"due","2026-09-08T12:00:00Z"); addAccount(sqlite,"not_yet","2026-09-08T12:00:01Z");
    addAccount(sqlite,"verified","2026-01-01T00:00:00Z",{verified:"2026-10-01"}); addAccount(sqlite,"exempt","2026-01-01T00:00:00Z",{exempt:"2026-10-01"});
    assert.equal(await trashLongBlockedProfiles(binding,now),3);
    for (const row of sqlite.prepare("SELECT status,trashed_by_kind FROM profiles WHERE owner_id='due'").all()) assert.deepEqual({...row},{status:"approved",trashed_by_kind:"email_verification"});
    assert.equal(sqlite.prepare("SELECT count(*) n FROM profiles WHERE trashed_at IS NOT NULL").get().n,3);
    assert.equal(sqlite.prepare("SELECT count(*) n FROM admin_audit_logs").get().n,3);
    assert.equal(await trashLongBlockedProfiles(binding,now),0);
    assert.doesNotMatch(await source("worker/email-verification.ts"),/MEDIA\.delete|DELETE FROM profiles|DELETE FROM users/);
  } finally {sqlite.close();}
});

test("existing sessions are blocked server-side; verify/logout/assets stay reachable without loops", async () => {
  const {sqlite,binding}=localDb(); try {
    await migrate(sqlite); addAccount(sqlite,"blocked","2026-01-01T00:00:00Z");
    const hash=await (await import(stubAuth)).sha256("secret");
    sqlite.prepare("INSERT INTO auth_sessions VALUES ('s','blocked',?,'2099-01-01T00:00:00Z')").run(hash);
    const cookie="chile3x_user_session=s.secret";
    let response=await enforceEmailVerification(new Request("https://chile3x.cl/mi-cuenta",{headers:{cookie}}),binding);
    assert.equal(response.status,303); assert.match(response.headers.get("location"),/\/verificar-correo$/); assert.match(response.headers.get("cache-control"),/no-store/);
    response=await enforceEmailVerification(new Request("https://chile3x.cl/api/perfiles/p/media",{method:"POST",headers:{cookie,"content-type":"application/json"}}),binding);
    assert.equal(response.status,403); assert.equal((await response.json()).error,"email_verification_required");
    for(const path of ["/verificar-correo","/api/auth/reenviar-verificacion","/api/auth/session/logout","/_vinext/image","/assets/x.css"]) assert.equal(verificationGuardExemptPath(path),true);
    for(const path of ["/","/escorts/concepcion","/mi-cuenta/datos-personales","/api/mi-cuenta/estado"]) assert.equal(verificationGuardExemptPath(path),false);
    assert.equal(await enforceEmailVerification(new Request("https://chile3x.cl/",{headers:{cookie:"chile3x_user_session=s.forged"}}),binding),null);
    sqlite.prepare("UPDATE users SET email_verification_exempt_at='2026-10-09' WHERE id='blocked'").run();
    assert.equal(await enforceEmailVerification(new Request("https://chile3x.cl/mi-cuenta",{headers:{cookie}}),binding),null);
  } finally {sqlite.close();}
});

test("scheduled block reminders are bounded, persistent, deduplicated and retry after delivery failure", async () => {
  const {sqlite,binding}=localDb(); globalThis.__graceMail={calls:[],delivered:true}; try {
    await migrate(sqlite); addAccount(sqlite,"pending","2026-10-08T00:00:00Z");
    await handleEmailVerificationScheduled({DB:binding});
    assert.equal(globalThis.__graceMail.calls.length,1); assert.equal(globalThis.__graceMail.calls[0].blocked,true);
    assert.ok(sqlite.prepare("SELECT email_verification_notice_at n FROM users WHERE id='pending'").get().n);
    await handleEmailVerificationScheduled({DB:binding}); assert.equal(globalThis.__graceMail.calls.length,1);
    addAccount(sqlite,"failed","2026-10-08T00:00:00Z"); globalThis.__graceMail.delivered=false;
    await handleEmailVerificationScheduled({DB:binding}); await handleEmailVerificationScheduled({DB:binding});
    assert.equal(globalThis.__graceMail.calls.length,2);
    sqlite.prepare("UPDATE users SET email_verification_notice_attempt_at='2020-01-01' WHERE id='failed'").run();
    await handleEmailVerificationScheduled({DB:binding}); assert.equal(globalThis.__graceMail.calls.length,3);
  } finally {delete globalThis.__graceMail;sqlite.close();}
});

test("click/tap privacy regions stay inside the photo even at edges", () => {
  for (const x of [0,.1,.5,.9,1]) for (const y of [0,.5,1]) assert.equal(validPrivacyRegions([privacyRegionAtPoint(x,y)]),true);
});

test("exceptions require account-management permission and never mark an email verified or undo a ban", async () => {
  const route=await source("app/api/admin/users/[userId]/route.ts");
  const branch=route.slice(route.indexOf('if (action === "email_exempt"'),route.indexOf('if (action === "send_reset"'));
  assert.match(route,/adminHasCapability\(admin, "accounts.manage"\)/); assert.match(branch,/reason.length < 5/);
  assert.match(branch,/recordAdminAudit/);assert.doesNotMatch(branch,/emailVerifiedAt: now|isActive: true|adminDisabledAt: null/);
  assert.match(await source("app/admin/page.tsx"),/email_status=blocked/);
  assert.match(await source("app/verificar-correo/page.tsx"),/privatePageMetadata/);
});
