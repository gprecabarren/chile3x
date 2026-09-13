import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { appleAuthAttempts } from "@/db/schema";
import { sha256 } from "@/lib/auth";

const APPLE_AUTH_DURATION_SECONDS = 10 * 60;

function opaqueToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export async function createAppleAuthAttempt(intent: "login" | "register", returnTo: string) {
  const db = await getDb();
  const state = opaqueToken();
  const nonce = opaqueToken();
  const now = Date.now();
  await db.delete(appleAuthAttempts).where(lt(appleAuthAttempts.expiresAt, new Date(now).toISOString()));
  await db.insert(appleAuthAttempts).values({
    id: `apple_auth_${crypto.randomUUID()}`,
    stateHash: await sha256(state),
    nonce,
    intent,
    returnTo,
    expiresAt: new Date(now + APPLE_AUTH_DURATION_SECONDS * 1000).toISOString(),
  });
  return { state, nonce };
}

export async function consumeAppleAuthAttempt(state: string) {
  if (state.length < 32 || state.length > 200) return null;
  const rows = await (await getDb()).delete(appleAuthAttempts).where(and(
    eq(appleAuthAttempts.stateHash, await sha256(state)),
    gt(appleAuthAttempts.expiresAt, new Date().toISOString()),
  )).returning({
    id: appleAuthAttempts.id,
    nonce: appleAuthAttempts.nonce,
    intent: appleAuthAttempts.intent,
    returnTo: appleAuthAttempts.returnTo,
  });
  return rows[0] ?? null;
}

