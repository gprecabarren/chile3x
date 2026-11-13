import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migration = "0072_remove_demo_listings.sql";
const sql = file => readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8");

test("demo retirement removes their data but preserves surviving listings and shared objects", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON");
    for (const name of readdirSync(new URL("../drizzle/", import.meta.url)).filter(name => name.endsWith(".sql") && name < migration).sort()) {
      db.exec(sql(name));
    }
    db.exec(`
      INSERT INTO users(id,email,role) VALUES ('retire-fixture','retire-fixture@example.invalid','advertiser');
      INSERT INTO profiles(id,owner_id,type,slug,display_name,city,region)
      VALUES ('real-fixture','retire-fixture','rental','real-fixture','Real','Concepción','Región del Biobío');
      INSERT INTO profiles(id,owner_id,type,slug,display_name,city,region,is_demo)
      VALUES ('demo-fixture','retire-fixture','rental','demo-fixture','Demo','Concepción','Región del Biobío',1);
      INSERT INTO profile_media(id,profile_id,r2_key,media_type,content_type)
      VALUES ('demo-private','demo-fixture','retired-only','image','image/jpeg'),
             ('demo-shared','demo-fixture','shared','image','image/jpeg'),
             ('real-shared','real-fixture','shared','image','image/jpeg');
      INSERT INTO admin_notifications(id,kind,profile_id,summary)
      VALUES ('demo-notice','profile_created','demo-fixture','Demo');
    `);
    db.exec(sql(migration));
    assert.equal(db.prepare("SELECT count(*) n FROM profiles WHERE is_demo=1").get().n, 0);
    assert.ok(db.prepare("SELECT id FROM profiles WHERE id='real-fixture'").get());
    assert.ok(db.prepare("SELECT id FROM users WHERE id='retire-fixture'").get());
    assert.equal(db.prepare("SELECT count(*) n FROM admin_notifications WHERE id='demo-notice'").get().n, 0);
    assert.equal(db.prepare("SELECT count(*) n FROM profile_media WHERE id='demo-private'").get().n, 0);
    assert.ok(db.prepare("SELECT id FROM data_deletion_jobs WHERE r2_key='retired-only'").get());
    assert.equal(db.prepare("SELECT id FROM data_deletion_jobs WHERE r2_key='shared'").get(), undefined);
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db.close();
  }
});
