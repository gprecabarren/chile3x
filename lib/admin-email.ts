import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { adminGithubAccess, adminGithubIdentities } from "@/db/schema";

/**
 * A verified GitHub email is reserved for administration. This keeps public
 * advertiser/tester authentication separate from the privileged panel even
 * though administrators use synthetic internal user addresses.
 */
export async function isReservedAdminEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const db = await getDb();
  const [[identity], [activeGrant]] = await Promise.all([
    db.select({ id: adminGithubIdentities.id }).from(adminGithubIdentities)
      .where(eq(adminGithubIdentities.githubEmail, normalized)).limit(1),
    db.select({ id: adminGithubAccess.id }).from(adminGithubAccess)
      .where(and(eq(adminGithubAccess.protectedEmail, normalized), eq(adminGithubAccess.isActive, true))).limit(1),
  ]);
  return Boolean(identity || activeGrant);
}
