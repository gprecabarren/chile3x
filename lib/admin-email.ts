import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { accountAppleIdentities, accountGoogleIdentities, adminGithubAccess, adminGithubIdentities, users } from "@/db/schema";

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
      .where(sql`lower(trim(${adminGithubIdentities.githubEmail})) = ${normalized}`).limit(1),
    db.select({ id: adminGithubAccess.id }).from(adminGithubAccess)
      .where(sql`lower(trim(${adminGithubAccess.protectedEmail})) = ${normalized}`).limit(1),
  ]);
  return Boolean(identity || activeGrant);
}

export async function hasPublicAccountEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const db = await getDb();
  const rows = await db.select({ id: users.id }).from(users).where(sql`${users.role} <> 'admin' and (
    lower(trim(${users.email})) = ${normalized}
    or exists (select 1 from ${accountGoogleIdentities} where user_id = ${users.id} and lower(trim(google_email)) = ${normalized})
    or exists (select 1 from ${accountAppleIdentities} where user_id = ${users.id} and lower(trim(apple_email)) = ${normalized})
  )`).limit(1);
  return rows.length > 0;
}

export async function isReservedPublicAccountIdentity(userId: string) {
  const db = await getDb();
  const [conflict] = await db.select({ id: users.id }).from(users).where(sql`${users.id} = ${userId} AND (
    EXISTS (SELECT 1 FROM admin_github_access WHERE lower(trim(protected_email)) IN (
      SELECT lower(trim(email)) FROM users WHERE id = ${userId} UNION SELECT lower(trim(google_email)) FROM account_google_identities WHERE user_id = ${userId} UNION SELECT lower(trim(apple_email)) FROM account_apple_identities WHERE user_id = ${userId}))
    OR EXISTS (SELECT 1 FROM admin_github_identities WHERE lower(trim(github_email)) IN (
      SELECT lower(trim(email)) FROM users WHERE id = ${userId} UNION SELECT lower(trim(google_email)) FROM account_google_identities WHERE user_id = ${userId} UNION SELECT lower(trim(apple_email)) FROM account_apple_identities WHERE user_id = ${userId}))
  )`).limit(1);
  return Boolean(conflict);
}

export async function hasAdministrativeEmailConflict(userId: string, protectedEmail: string | null) {
  const [identity] = await (await getDb()).select({email:adminGithubIdentities.githubEmail}).from(adminGithubIdentities).where(eq(adminGithubIdentities.userId,userId)).limit(1);
  const emails=[...new Set([protectedEmail,identity?.email].filter((email):email is string=>Boolean(email)).map(email=>email.trim().toLowerCase()))];
  return (await Promise.all(emails.map(email=>hasPublicAccountEmail(email)))).some(Boolean);
}
