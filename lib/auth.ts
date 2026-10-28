import { and, eq, gt, lte } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import type { NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminGithubAccess, authSessions, users } from "@/db/schema";
import type { AdminAccessLevel } from "@/lib/admin-permissions";
import { sessionContextFromHeaders, sessionContextFromRequest, type SessionAuthMethod } from "@/lib/session-context";
import { emailVerificationState, type EmailVerificationRecord } from "@/lib/email-verification-policy";
import { hasAdministrativeEmailConflict, isReservedPublicAccountIdentity } from "@/lib/admin-email";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, ADMIN_OAUTH_STATE_COOKIE, ADMIN_OAUTH_RETURN_TO_COOKIE, ADMIN_OAUTH_COOKIE_PATH, browserSessionKey, browserSessionState, parseSessionToken, sessionMatchesMode, type SessionMode } from "@/lib/session-policy";

const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 12;
const USER_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
// Cloudflare Workers supports PBKDF2 iteration counts up to 100,000.
const PASSWORD_ITERATIONS = 100_000;

type RuntimeAuthEnv = {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

export type AccountRole = "visitor" | "advertiser" | "tester" | "admin";

export type AccountUser = EmailVerificationRecord & {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  role: AccountRole;
};

export type AdminUser = AccountUser & {
  role: "admin";
  accessLevel: AdminAccessLevel;
  githubLogin: string;
  isProtectedOwner: boolean;
};

const TESTER_AUTO_APPROVAL_EMAIL = "chefcito_burrito@outlook.com";

/**
 * A deliberately narrow moderation exception for the internal tester account.
 * It still has to retain the tester role, so a role change immediately removes
 * this privilege.
 */
export function hasTesterAutoApproval(user: AccountUser | null | undefined) {
  return user?.role === "tester" && user.email.trim().toLowerCase() === TESTER_AUTO_APPROVAL_EMAIL;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function createOpaqueToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS }, key, 256);
  return ["pbkdf2-sha256", PASSWORD_ITERATIONS, toBase64Url(salt), toBase64Url(new Uint8Array(bits))].join("$");
}

export async function verifyPassword(password: string, encodedHash: string | null) {
  if (!encodedHash) {
    return false;
  }

  const [algorithm, iterationText, saltText, expectedText] = encodedHash.split("$");
  const iterations = Number.parseInt(iterationText ?? "", 10);

  if (algorithm !== "pbkdf2-sha256" || !saltText || !expectedText || !Number.isSafeInteger(iterations) || iterations < 100_000) {
    return false;
  }

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64Url(saltText), iterations }, key, 256);
  const actual = toBase64Url(new Uint8Array(bits));

  if (actual.length !== expectedText.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual.charCodeAt(index) ^ expectedText.charCodeAt(index);
  }

  return difference === 0;
}

export async function getGitHubOAuthConfig() {
  const { env } = await import("cloudflare:workers");
  const runtimeEnv = env as unknown as RuntimeAuthEnv;

  if (!runtimeEnv.GITHUB_CLIENT_ID || !runtimeEnv.GITHUB_CLIENT_SECRET) {
    return null;
  }

  return {
    clientId: runtimeEnv.GITHUB_CLIENT_ID,
    clientSecret: runtimeEnv.GITHUB_CLIENT_SECRET,
  };
}

export { safeAdminReturnTo, safeAccountReturnTo } from "./safe-return-to";

export function sessionCookieOptions(maxAge = ADMIN_SESSION_DURATION_SECONDS) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: true,
  };
}

async function createSession(userId: string, durationSeconds: number, request: Request, authMethod: SessionAuthMethod) {
  const secret = createOpaqueToken();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
  const context = sessionContextFromRequest(request);
  const db = await getDb();

  const [account] = await db.select({ role: users.role, email: users.email }).from(users).where(and(eq(users.id, userId), eq(users.isActive, true))).limit(1);
  const mode = authMethod === "github" ? "admin" : "account";
  if (!account || !sessionMatchesMode(mode, account.role, authMethod) || (mode === "account" && await isReservedPublicAccountIdentity(userId))) {
    throw new Error("Esta identidad no puede iniciar una sesión de ese tipo.");
  }
  if (mode === "admin") {
    const [grant] = await db.select({ id: adminGithubAccess.id, protectedEmail: adminGithubAccess.protectedEmail }).from(adminGithubAccess).where(and(eq(adminGithubAccess.userId, userId), eq(adminGithubAccess.isActive, true))).limit(1);
    if (!grant || await hasAdministrativeEmailConflict(userId,grant.protectedEmail)) throw new Error("El acceso administrativo no está autorizado o su correo está vinculado a una cuenta pública.");
  }
  const browserKey = browserSessionKey(request.headers.get("cookie"));
  const previous = browserSessionState(request.headers.get("cookie"));
  if (!browserKey || previous.conflict) throw new Error("No pudimos confirmar este navegador. Vuelve a abrir la página de acceso e inténtalo nuevamente.");
  const browserKeyHash = await sha256(browserKey);
  const values = {
    id,
    userId,
    tokenHash: await sha256(secret),
    browserKeyHash,
    authMethod,
    ...context,
    lastSeenAt: now,
    expiresAt,
    createdAt: now,
  };
  const proofs = await Promise.all(previous.entries.slice(0, 8).flatMap(entry => {
    const token = parseSessionToken(entry.value);
    return token ? [sha256(token.secret).then(hash => ({ id: token.id, hash }))] : [];
  }));
  const revocations = proofs.map(proof => db.delete(authSessions).where(and(eq(authSessions.id, proof.id), eq(authSessions.tokenHash, proof.hash))));
  // The unique browser slot and token rotation happen in one D1 transaction.
  // Two requests holding the same old cookie cannot leave two valid bearers.
  // Upsert rotates the primary ID too, so stale responses/proofs cannot revoke
  // the winner; credentials on other browsers remain completely independent.
  await db.batch([
    db.delete(authSessions).where(and(eq(authSessions.userId, userId), lte(authSessions.expiresAt, now))),
    ...revocations,
    db.insert(authSessions).values(values).onConflictDoUpdate({ target: authSessions.browserKeyHash, set: values }),
  ]);

  return `${id}.${secret}`;
}

export async function createAdminSession(userId: string, request: Request) {
  return createSession(userId, ADMIN_SESSION_DURATION_SECONDS, request, "github");
}

export async function createUserSession(userId: string, request: Request, authMethod: Exclude<SessionAuthMethod, "github"> = "password") {
  return createSession(userId, USER_SESSION_DURATION_SECONDS, request, authMethod);
}

export function sessionIdFromToken(sessionToken: string | undefined) {
  return parseSessionToken(sessionToken)?.id ?? null;
}

export async function deleteCurrentSession(sessionToken: string | undefined) {
  if (!sessionToken) {
    return;
  }

  const token = parseSessionToken(sessionToken);
  if (!token) return;
  const { id, secret } = token;

  await (await getDb()).delete(authSessions).where(and(
    eq(authSessions.id, id),
    eq(authSessions.tokenHash, await sha256(secret)),
  ));
}

export async function deleteBrowserSessions(request: Request) {
  for (const entry of browserSessionState(request.headers.get("cookie")).entries) await deleteCurrentSession(entry.value);
}

// Apple returns by cross-site POST, where SameSite=Lax cookies are absent.
// Retain only revocation proofs in its short-lived, nonce-bound attempt.
export async function captureBrowserSessionProofs(request: Request) {
  const proofs = [];
  for (const entry of browserSessionState(request.headers.get("cookie")).entries.slice(0, 8)) {
    const token = parseSessionToken(entry.value);
    if (token) proofs.push({ id: token.id, hash: await sha256(token.secret) });
  }
  return JSON.stringify(proofs);
}

export async function revokeAuthAttemptSessions(value: string | undefined) {
  if (!value || value.length > 3000) return;
  let proofs: unknown;
  try { proofs = JSON.parse(value); } catch { return; }
  if (!Array.isArray(proofs) || proofs.length > 8) return;
  const db = await getDb();
  for (const proof of proofs) {
    if (!proof || typeof proof !== "object" || typeof proof.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(proof.id)
      || typeof proof.hash !== "string" || !/^[a-f0-9]{64}$/.test(proof.hash)) continue;
    await db.delete(authSessions).where(and(eq(authSessions.id, proof.id), eq(authSessions.tokenHash, proof.hash)));
  }
}

export function clearSessionCookies(response: NextResponse) {
  for (const name of [ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE]) response.cookies.set({ name, value: "", ...sessionCookieOptions(0) });
  for (const name of [ADMIN_OAUTH_STATE_COOKIE, ADMIN_OAUTH_RETURN_TO_COOKIE]) response.cookies.set({ name, value: "", ...sessionCookieOptions(0), path: ADMIN_OAUTH_COOKIE_PATH });
}

function setExclusiveSessionCookie(response: NextResponse, mode: SessionMode, token: string) {
  const name = mode === "admin" ? ADMIN_SESSION_COOKIE : USER_SESSION_COOKIE;
  const opposite = mode === "admin" ? USER_SESSION_COOKIE : ADMIN_SESSION_COOKIE;
  response.cookies.set({ name, value: token, ...sessionCookieOptions(mode === "admin" ? ADMIN_SESSION_DURATION_SECONDS : USER_SESSION_DURATION_SECONDS) });
  response.cookies.set({ name: opposite, value: "", ...sessionCookieOptions(0) });
}
export const setUserSessionCookie = (response: NextResponse, token: string) => setExclusiveSessionCookie(response, "account", token);
export const setAdminSessionCookie = (response: NextResponse, token: string) => setExclusiveSessionCookie(response, "admin", token);

// A page can ask for the current visitor from both the root layout and its
// route component. Cache it for that render so we only verify the session once.
// The cache is scoped to a server request, so logout, deactivation and expiry
// continue to take effect on the very next navigation.
const getSessionUser = cache(async function getSessionUser(cookieName: string): Promise<AccountUser | null> {
  const state = browserSessionState((await headers()).get("cookie"));
  const mode = cookieName === ADMIN_SESSION_COOKIE ? "admin" : "account";
  if (state.conflict || state.mode !== mode) return null;
  const sessionToken = state.entries.find(entry => entry.name === cookieName)?.value;

  if (!sessionToken) {
    return null;
  }

  const token = parseSessionToken(sessionToken);
  if (!token) return null;
  const { id, secret } = token;

  const db = await getDb();
  const [record] = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      emailVerifiedAt: users.emailVerifiedAt,
      emailVerificationDeadline: users.emailVerificationDeadline,
      emailVerificationExemptAt: users.emailVerificationExemptAt,
      sessionId: authSessions.id,
      sessionAuthMethod: authSessions.authMethod,
      sessionIpAddress: authSessions.ipAddress,
      sessionUserAgent: authSessions.userAgent,
      sessionCountryCode: authSessions.countryCode,
      sessionLastSeenAt: authSessions.lastSeenAt,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(
      eq(authSessions.id, id),
      eq(authSessions.tokenHash, await sha256(secret)),
      gt(authSessions.expiresAt, new Date().toISOString()),
    ))
    .limit(1);

  if (!record || !record.isActive || !sessionMatchesMode(mode, record.role, record.sessionAuthMethod)
    || (mode === "account" && await isReservedPublicAccountIdentity(record.id))) {
    return null;
  }

  const now = new Date();
  const lastSeen = new Date(record.sessionLastSeenAt.replace(" ", "T") + (record.sessionLastSeenAt.includes("T") ? "" : "Z"));
  if (!Number.isFinite(lastSeen.getTime()) || now.getTime() - lastSeen.getTime() >= 15 * 60 * 1000) {
    const context = sessionContextFromHeaders(await headers());
    await db.update(authSessions).set({
      lastSeenAt: now.toISOString(),
      ipAddress: context.ipAddress ?? record.sessionIpAddress,
      userAgent: context.userAgent ?? record.sessionUserAgent,
      countryCode: context.countryCode ?? record.sessionCountryCode,
    }).where(eq(authSessions.id, record.sessionId));
  }

  return {
    id: record.id,
    email: record.email,
    username: record.username,
    displayName: record.displayName,
    role: record.role,
    createdAt: record.createdAt,
    emailVerifiedAt: record.emailVerifiedAt,
    emailVerificationDeadline: record.emailVerificationDeadline,
    emailVerificationExemptAt: record.emailVerificationExemptAt,
  } as AccountUser;
});

export const getCurrentAdmin = cache(async function getCurrentAdmin(): Promise<AdminUser | null> {
  const user = await getSessionUser(ADMIN_SESSION_COOKIE);
  if (user?.role !== "admin") return null;

  // The grant is checked on every administrative request. Revoking access
  // therefore takes effect immediately, even if a browser still has a valid
  // session cookie.
  const [grant] = await (await getDb()).select({
    accessLevel: adminGithubAccess.accessLevel,
    githubLogin: adminGithubAccess.githubLogin,
    isProtectedOwner: adminGithubAccess.isProtectedOwner,
    protectedEmail: adminGithubAccess.protectedEmail,
  }).from(adminGithubAccess).where(and(
    eq(adminGithubAccess.userId, user.id),
    eq(adminGithubAccess.isActive, true),
  )).limit(1);

  if (grant && await hasAdministrativeEmailConflict(user.id,grant.protectedEmail)) return null;
  return grant ? {
    ...user,
    role: "admin",
    accessLevel: grant.accessLevel,
    githubLogin: grant.githubLogin,
    isProtectedOwner: grant.isProtectedOwner,
  } : null;
});

export async function getCurrentUser() {
  const user = await getSessionUser(USER_SESSION_COOKIE);
  return user && emailVerificationState(user) !== "blocked" ? user : null;
}

// Restricted identity: ONLY for verification/recovery UI, never normal actions.
export async function getVerificationUser() {
  return getSessionUser(USER_SESSION_COOKIE);
}

export function getSessionCookieName() {
  return ADMIN_SESSION_COOKIE;
}

export function getUserSessionCookieName() {
  return USER_SESSION_COOKIE;
}

export function getUserSessionDuration() {
  return USER_SESSION_DURATION_SECONDS;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;

  if (!origin || origin !== expectedOrigin) {
    throw new Error("Invalid request origin");
  }
}
