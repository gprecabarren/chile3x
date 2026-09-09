import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { accountTokens, users } from "@/db/schema";
import { createOpaqueToken, sha256 } from "@/lib/auth";

export const ACCOUNT_REACTIVATION_COOKIE = "chile3x_account_reactivation";
export const ACCOUNT_REACTIVATION_DURATION_SECONDS = 10 * 60;

export function splitReactivationToken(value: string | undefined) {
  if (!value) return null;
  const [id, secret, extra] = value.split(".");
  return id && secret && !extra ? { id, secret } : null;
}

export async function createAccountReactivationIntent(userId: string) {
  const db = await getDb();
  const id = `reactivate_${crypto.randomUUID()}`;
  const secret = createOpaqueToken();
  await db.delete(accountTokens).where(and(
    eq(accountTokens.userId, userId),
    eq(accountTokens.purpose, "reactivate_account"),
    isNull(accountTokens.usedAt),
  ));
  await db.insert(accountTokens).values({
    id,
    userId,
    purpose: "reactivate_account",
    tokenHash: await sha256(secret),
    expiresAt: new Date(Date.now() + ACCOUNT_REACTIVATION_DURATION_SECONDS * 1000).toISOString(),
  });
  return `${id}.${secret}`;
}

export async function readAccountReactivationIntent(value: string | undefined) {
  const token = splitReactivationToken(value);
  if (!token) return null;
  const [record] = await (await getDb()).select({
    tokenId: accountTokens.id,
    userId: users.id,
    email: users.email,
    displayName: users.displayName,
    selfDisabledAt: users.selfDisabledAt,
    adminDisabledAt: users.adminDisabledAt,
  }).from(accountTokens)
    .innerJoin(users, eq(accountTokens.userId, users.id))
    .where(and(
      eq(accountTokens.id, token.id),
      eq(accountTokens.purpose, "reactivate_account"),
      eq(accountTokens.tokenHash, await sha256(token.secret)),
      isNull(accountTokens.usedAt),
      gt(accountTokens.expiresAt, new Date().toISOString()),
    )).limit(1);
  return record ?? null;
}
