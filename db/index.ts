import { drizzle } from "drizzle-orm/d1";

export async function getDb() {
  const { env } = await import("cloudflare:workers");

  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  // All application queries use the typed SQL builder and import their tables
  // directly. Passing the entire schema enables the unused relational db.query
  // API and re-inspects 62 tables on EVERY getDb() call. On Workers Free that
  // repeated synchronous work competes with SSR's 10 ms CPU budget. Omitting
  // it does not change SQL, validation, migrations or query result mapping.
  return drizzle(env.DB);
}
