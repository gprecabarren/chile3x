import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { eq } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { chileanDay } from "../lib/chile-day.ts";

const source = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("D1 SQL builder retains typed mapping, joins and writes without relational schema inspection", async () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("CREATE TABLE cpu_accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, active INTEGER NOT NULL); CREATE TABLE cpu_ads (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL)");
  let preparations = 0;
  const wrap = (statement, values = []) => ({
    bind: (...params) => wrap(statement, params),
    raw: async () => { statement.setReturnArrays(true); return statement.all(...values); },
    all: async () => ({ results: statement.all(...values) }),
    run: async () => ({ success: true, meta: statement.run(...values) }),
  });
  const binding = { prepare: sql => { preparations++; return wrap(sqlite.prepare(sql)); } };
  globalThis.__cpuTestEnv = { DB: binding };
  const hooks = registerHooks({ resolve(specifier, context, next) {
    if (specifier === "cloudflare:workers") return { url: "data:text/javascript,export const env=globalThis.__cpuTestEnv", shortCircuit: true };
    return next(specifier, context);
  } });
  try {
    const { getDb } = await import("../db/index.ts");
    const db = await getDb();
    assert.equal(preparations, 0, "constructing the builder must not issue SQL");
    assert.deepEqual(Object.keys(db.query), [], "unused relational tables must not be constructed");
    const accounts = sqliteTable("cpu_accounts", { id: text("id").primaryKey(), name: text("name").notNull(), active: integer("active", { mode: "boolean" }).notNull() });
    const ads = sqliteTable("cpu_ads", { id: text("id").primaryKey(), ownerId: text("owner_id").notNull() });
    await db.insert(accounts).values({ id: "a", name: "Original", active: true });
    await db.insert(ads).values({ id: "p", ownerId: "a" });
    assert.deepEqual(await db.select().from(accounts), [{ id: "a", name: "Original", active: true }]);
    assert.deepEqual(await db.select({ account: accounts, adId: ads.id }).from(accounts).innerJoin(ads, eq(accounts.id, ads.ownerId)), [{ account: { id: "a", name: "Original", active: true }, adId: "p" }]);
    await db.update(accounts).set({ name: "Updated", active: false }).where(eq(accounts.id, "a"));
    assert.deepEqual(await db.select().from(accounts), [{ id: "a", name: "Updated", active: false }]);
    await db.delete(ads).where(eq(ads.id, "p"));
    assert.deepEqual(await db.select().from(ads), []);
    assert.doesNotMatch(await source("db/index.ts"), /import \* as schema|drizzle\(env\.DB,\s*\{\s*schema/);
  } finally {
    hooks.deregister(); delete globalThis.__cpuTestEnv; sqlite.close();
  }
});

test("shared navigation does not speculatively render every public or account section", async () => {
  const link = await source("app/NavigationLink.tsx");
  assert.match(link, /<Link \{\.\.\.props\} prefetch=\{props\.prefetch \?\? false\}/);
  for (const path of ["app/page.tsx", "app/directorio/_components.tsx", "app/directorio/PublicMobileMenu.tsx", "app/mi-cuenta/_components.tsx", "app/admin/_components.tsx"]) {
    assert.match(await source(path), /import Link from "@\/app\/NavigationLink"/, path);
  }
});

test("administrator grants are deduplicated only within a render, never cached across requests", async () => {
  const auth = await source("lib/auth.ts");
  assert.match(auth, /getCurrentAdmin = cache\(async function getCurrentAdmin/);
  assert.match(auth, /eq\(adminGithubAccess\.isActive, true\)/);
  assert.doesNotMatch(auth, /let cachedAdmin|const adminCache = new Map/);
});

test("reused day formatter preserves Santiago dates at midnight and daylight-saving boundaries", () => {
  for (const [instant, expected] of [
    ["2026-01-01T02:59:59Z", "2025-12-31"],
    ["2026-01-01T03:00:00Z", "2026-01-01"],
    ["2026-07-01T03:59:59Z", "2026-06-30"],
    ["2026-07-01T04:00:00Z", "2026-07-01"],
    ["2026-10-07T02:25:13Z", "2026-10-06"],
  ]) assert.equal(chileanDay(new Date(instant)), expected, instant);
});
