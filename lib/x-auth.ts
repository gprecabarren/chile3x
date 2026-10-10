import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { xAuthAttempts, xRegistrationIntents } from "@/db/schema";
import { createOpaqueToken, sha256 } from "@/lib/auth";
import { xCodeChallenge, type XConfig, type XIdentity } from "@/lib/x-oauth";
import { getSiteSettings } from "@/lib/site-settings";
import { readXServerCredentials, X_CALLBACK_URL } from "@/lib/x-settings";

export async function getXAuthConfig(): Promise<XConfig | null> {
  try {
    // Disabled by default, including when old Cloudflare credentials exist.
    // Only an explicitly saved administrator setting can enable the provider.
    if ((await getSiteSettings()).x_sign_in_status !== "enabled") return null;
    const { clientId, clientSecret } = await readXServerCredentials();
    if (!clientId || !clientSecret) return null;
    return { clientId, clientSecret, redirectUri: X_CALLBACK_URL };
  } catch { return null; }
}

export async function createXAuthAttempt(intent: "login" | "register" | "link", returnTo: string, userId?: string) {
  const db = await getDb();
  const state = createOpaqueToken(), browser = createOpaqueToken(), verifier = createOpaqueToken();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await db.delete(xAuthAttempts).where(lt(xAuthAttempts.expiresAt, new Date().toISOString()));
  await db.insert(xAuthAttempts).values({ id: `x_auth_${crypto.randomUUID()}`, stateHash: await sha256(state), browserHash: await sha256(browser), codeVerifier: verifier, intent, userId: userId ?? null, returnTo, expiresAt });
  return { state, browser, challenge: await xCodeChallenge(verifier) };
}

export async function consumeXAuthAttempt(state: string, browser: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(browser)) return null;
  const [attempt] = await (await getDb()).delete(xAuthAttempts).where(and(eq(xAuthAttempts.stateHash, await sha256(state)), eq(xAuthAttempts.browserHash, await sha256(browser)), gt(xAuthAttempts.expiresAt, new Date().toISOString()))).returning();
  return attempt ?? null;
}

export async function createXRegistrationIntent(identity: XIdentity) {
  const db = await getDb();
  const secret = createOpaqueToken(), id = `x_registration_${crypto.randomUUID()}`;
  await db.delete(xRegistrationIntents).where(lt(xRegistrationIntents.expiresAt, new Date().toISOString()));
  await db.insert(xRegistrationIntents).values({ id, tokenHash: await sha256(secret), xSubject: identity.subject, xUsername: identity.username, displayName: identity.displayName, email: identity.email, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
  return { value: `${id}.${secret}`, maxAge: 600 };
}

export async function readXRegistrationIntent(value?: string) {
  const [id, secret, extra] = value?.split(".") ?? [];
  if (!id || !secret || extra || !/^[A-Za-z0-9_-]{43}$/.test(secret)) return null;
  const [row] = await (await getDb()).select().from(xRegistrationIntents).where(and(eq(xRegistrationIntents.id, id), eq(xRegistrationIntents.tokenHash, await sha256(secret)), gt(xRegistrationIntents.expiresAt, new Date().toISOString()))).limit(1);
  return row ? { id: row.id, subject: row.xSubject, username: row.xUsername, displayName: row.displayName, fullName: row.displayName, email: row.email } : null;
}
