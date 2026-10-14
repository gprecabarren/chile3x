import { and, eq, gt, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { authSessionCompletions } from "@/db/schema";
import { createOpaqueToken, sha256 } from "@/lib/auth";
import { parseSessionToken } from "@/lib/session-policy";
export const APPLE_COMPLETION_COOKIE = "chile3x_apple_completion";
export const APPLE_COMPLETION_COOKIE_PATH = "/api/auth/apple/finish";

/** Do not mint a login on Apple's cookie-less form_post. Finish on same origin. */
export async function createAppleSessionCompletion(userId: string, returnTo: string, previousSessions: string) {
  const db = await getDb(), id = crypto.randomUUID(), secret = createOpaqueToken();
  await db.delete(authSessionCompletions).where(lte(authSessionCompletions.expiresAt,new Date().toISOString()));
  await db.insert(authSessionCompletions).values({id,userId,returnTo,previousSessions,tokenHash:await sha256(secret),expiresAt:new Date(Date.now()+60_000).toISOString()});
  return `${id}.${secret}`;
}
export async function consumeAppleSessionCompletion(value?: string) {
  const token=parseSessionToken(value);if(!token)return null;
  const [record]=await (await getDb()).delete(authSessionCompletions).where(and(eq(authSessionCompletions.id,token.id),eq(authSessionCompletions.tokenHash,await sha256(token.secret)),gt(authSessionCompletions.expiresAt,new Date().toISOString()))).returning();
  return record??null;
}
