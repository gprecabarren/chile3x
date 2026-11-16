import test from "node:test";
import assert from "node:assert/strict";
import { createRequire, registerHooks } from "node:module";
import { createECDH, randomBytes } from "node:crypto";
import { readFileSync, readdirSync, realpathSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("../lib/mobile-push-") && !specifier.endsWith(".ts")) specifier += ".ts";
    return nextResolve(specifier, context);
  },
});
const { MOBILE_PUSH_MESSAGES, readMobilePushSubscription } = await import("../lib/mobile-push-policy.ts");
const { mobilePushKeys } = await import("../lib/mobile-push-keys.ts");
const { deliverMobilePush } = await import("../worker/mobile-push.ts");
hooks.deregister();

const secret = "A".repeat(43);
function subscription() {
  const recipient = createECDH("prime256v1");
  recipient.generateKeys();
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/example",
    keys: { p256dh: recipient.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") },
  };
}

function fixture() {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync("drizzle").filter(name => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(`drizzle/${name}`, "utf8"));
  }
  db.exec("PRAGMA foreign_keys=ON");
  db.exec(`
    INSERT INTO users(id,email,username,role) VALUES
      ('test_owner','owner@example.invalid','push-owner','advertiser'),
      ('test_sender','sender@example.invalid','push-sender','visitor'),
      ('test_moderator','mod@example.invalid','push-moderator','admin'),
      ('test_editor','editor@example.invalid','push-editor','admin');
    INSERT INTO admin_github_access(id,github_login,user_id,access_level) VALUES
      ('test_moderator','push-moderator','test_moderator','moderator'),
      ('test_editor','push-editor','test_editor','editor');
    INSERT INTO profiles(id,owner_id,slug,type,display_name,region,city,status) VALUES
      ('push-profile','test_owner','push-profile','escort','Ficha local','Biobío','Concepción','pending');
    INSERT INTO message_conversations(id,profile_id,visitor_user_id,owner_user_id) VALUES
      ('push-chat','push-profile','test_sender','test_owner');
  `);
  for (const id of ["test_owner", "test_sender", "test_moderator", "test_editor"]) {
    const device = subscription();
    db.prepare("INSERT INTO mobile_push_devices(id,user_id,browser_key_hash,endpoint,public_key,auth_secret) VALUES(?,?,?,?,?,?)")
      .run(id, id, id, device.endpoint + "/" + id, device.keys.p256dh, device.keys.auth);
  }
  return db;
}

test("events queue only for the intended subscribers and cover opted-in audit", () => {
  const db = fixture();
  try {
    db.exec(`
      INSERT INTO message_messages(id,conversation_id,sender_user_id,sender_role,body) VALUES ('push-message','push-chat','test_sender','visitor','Mensaje privado');
      INSERT INTO admin_notifications(id,kind,summary) VALUES ('push-registration','account_registered','Alta'),('push-moderation','media_uploaded','Revisión');
      UPDATE profiles SET status='approved' WHERE id='push-profile';
      INSERT INTO admin_audit_logs(id,actor_email,category,action,entity_type,summary) VALUES ('ignored-audit','admin@example.invalid','access','audit','profile','Movimiento');
      UPDATE mobile_push_devices SET audit_enabled=1 WHERE id IN ('test_moderator','test_editor');
      INSERT INTO admin_audit_logs(id,actor_email,category,action,entity_type,summary) VALUES ('push-audit','admin@example.invalid','access','audit','profile','Movimiento');
    `);
    const pending = () => db.prepare("SELECT device_id || ':' || kind AS notice FROM mobile_push_pending ORDER BY notice").all().map(row => row.notice);
    assert.deepEqual(pending(), ["test_moderator:audit", "test_moderator:moderation", "test_moderator:registration", "test_owner:approved", "test_owner:message"]);
    db.exec(`
      DELETE FROM mobile_push_pending;
      INSERT INTO message_conversation_preferences(id,conversation_id,user_id,is_muted) VALUES ('push-muted','push-chat','test_owner',1);
      INSERT INTO message_messages(id,conversation_id,sender_user_id,sender_role,body) VALUES ('push-message-2','push-chat','test_sender','visitor','Silenciado');
      INSERT INTO profiles(id,owner_id,slug,type,display_name,region,city,status) VALUES
        ('push-approved','test_owner','push-approved','rental','Ficha aprobada','Biobío','Concepción','approved');
    `);
    assert.deepEqual(pending(), ["test_owner:approved"]);
    db.exec(`
      INSERT INTO auth_sessions(id,user_id,token_hash,browser_key_hash,expires_at) VALUES ('push-expired','test_owner','expired','test_owner',datetime('now','-1 day'));
      DELETE FROM auth_sessions WHERE id='push-expired';
    `);
    assert.deepEqual(pending(), ["test_owner:approved"]);
    db.exec(`
      INSERT INTO auth_sessions(id,user_id,token_hash,browser_key_hash,expires_at) VALUES ('push-live','test_owner','live','test_owner',datetime('now','+1 day'));
      DELETE FROM auth_sessions WHERE id='push-live';
      INSERT INTO auth_sessions(id,user_id,token_hash,browser_key_hash,expires_at) VALUES ('push-switched','test_owner','new','test_sender',datetime('now','+1 day'));
    `);
    assert.deepEqual(pending(), []);
    assert.equal(db.prepare("SELECT COUNT(*) total FROM mobile_push_devices").get().total, 2);
  } finally { db.close(); }
});

test("delivery encrypts Web Push, rechecks roles and removes expired provider endpoints", async t => {
  const db = fixture();
  try {
    db.exec(`INSERT INTO mobile_push_pending(device_id,kind) VALUES
      ('test_moderator','registration'),('test_editor','moderation'),('test_sender','test'),('test_owner','approved')`);
    const deliveries = [];
    t.mock.method(globalThis, "fetch", async (url, options) => {
      deliveries.push({ url, ...options });
      return new Response(null, { status: url.endsWith("test_owner") ? 410 : 201 });
    });
    const binding = {
      prepare(query) {
        const statement = db.prepare(query);
        const bind = (...args) => ({
          all: async () => ({ results: statement.all(...args) }),
          first: async () => statement.get(...args),
          run: async () => statement.run(...args),
        });
        return { ...bind(), bind };
      },
    };
    await deliverMobilePush({ DB: binding, X_SETTINGS_ENCRYPTION_KEY: secret });
    assert.equal(deliveries.length, 3);
    assert.equal(db.prepare("SELECT COUNT(*) total FROM mobile_push_pending").get().total, 0);
    assert.equal(db.prepare("SELECT COUNT(*) total FROM mobile_push_devices WHERE id='test_owner'").get().total, 0);
    for (const delivery of deliveries) {
      assert.equal(delivery.redirect, "manual");
      assert.equal(delivery.headers.get("content-encoding"), "aes128gcm");
      assert.match(delivery.headers.get("authorization"), /^vapid t=/);
      assert.ok(delivery.body.length > 100);
      assert.doesNotMatch(Buffer.from(delivery.body).toString(), /anuncios|registro|dispositivo/);
    }
  } finally { db.close(); }
});

test("subscription providers and service worker destinations stay restricted", async () => {
  const keys = await mobilePushKeys(secret);
  assert.deepEqual(await mobilePushKeys(secret), keys);
  assert.notEqual((await mobilePushKeys("B".repeat(43))).publicKey, keys.publicKey);
  const device = subscription();
  assert.ok(readMobilePushSubscription(device));
  assert.equal(readMobilePushSubscription({ ...device, endpoint: "https://fcm.googleapis.com.example.invalid/send" }), null);
  const handlers = new Map();
  const notices = [];
  runInNewContext(readFileSync("public/mobile-push-worker.js", "utf8"), {
    self: {
      addEventListener: (type, callback) => handlers.set(type, callback),
      registration: { showNotification: async (_title, options) => notices.push(options) },
    },
  });
  assert.equal(handlers.has("fetch"), false);
  for (const notice of Object.values(MOBILE_PUSH_MESSAGES)) handlers.get("push")({ data: { json: () => notice }, waitUntil: () => {} });
  handlers.get("push")({ data: { json: () => ({ body: "Prueba", url: "https://example.invalid" }) }, waitUntil: () => assert.fail("forbidden destination") });
  assert.equal(notices.length, Object.keys(MOBILE_PUSH_MESSAGES).length);
});

test("Cloudflare runtime encrypts and signs a Web Push notification", async () => {
  const require = createRequire(pathToFileURL(realpathSync("node_modules/wrangler/package.json")));
  const { Miniflare } = await import(pathToFileURL(require.resolve("miniflare")).href);
  const { build } = require("esbuild");
  const bundle = await build({
    stdin: {
      contents: `
        import webPush from "web-push";
        import { mobilePushKeys } from "./lib/mobile-push-keys.ts";
        export default { async fetch() {
          const keys = await mobilePushKeys(${JSON.stringify(secret)});
          const details = webPush.generateRequestDetails(${JSON.stringify(subscription())}, "Prueba", {
            vapidDetails: keys, contentEncoding: "aes128gcm"
          });
          return Response.json({ publicKey: keys.publicKey, encrypted: details.body.length > 100, signed: details.headers.Authorization.startsWith("vapid t=") });
        } };
      `,
      resolveDir: process.cwd(),
    },
    bundle: true, platform: "node", format: "esm", write: false,
    banner: { js: 'import { createRequire } from "node:module"; const require = createRequire("/worker.mjs");' },
  });
  const worker = new Miniflare({
    modules: true,
    compatibilityDate: "2026-05-22",
    compatibilityFlags: ["nodejs_compat"],
    script: bundle.outputFiles[0].text,
  });
  try {
    const response = await worker.dispatchFetch("http://workers.test");
    assert.deepEqual(await response.json(), { publicKey: (await mobilePushKeys(secret)).publicKey, encrypted: true, signed: true });
  } finally { await worker.dispose(); }
});
