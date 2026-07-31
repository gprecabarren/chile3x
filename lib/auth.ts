import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { authSessions, users } from "@/db/schema";

const ADMIN_SESSION_COOKIE = "chile3x_admin_session";
const USER_SESSION_COOKIE = "chile3x_user_session";
const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 12;
const USER_SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
// Cloudflare Workers supports PBKDF2 iteration counts up to 100,000.
const PASSWORD_ITERATIONS = 100_000;

type RuntimeAuthEnv = {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

export type AccountRole = "visitor" | "advertiser" | "admin";

export type AccountUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: AccountRole;
};

export type AdminUser = AccountUser & { role: "admin" };

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

export function safeAdminReturnTo(value: string | null) {
  return value && value.startsWith("/admin") && !value.startsWith("//") ? value : "/admin";
}

export function safeAccountReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/mi-cuenta";
  }

  const url = new URL(value, "https://chile3x.invalid");
  const isAllowed = url.pathname === "/mi-cuenta"
    || url.pathname.startsWith("/mi-cuenta/")
    || url.pathname.startsWith("/perfil/")
    || url.pathname === "/escorts"
    || url.pathname.startsWith("/escorts/")
    || url.pathname === "/agencias"
    || url.pathname === "/arriendos";

  return isAllowed ? `${url.pathname}${url.search}` : "/mi-cuenta";
}

export function sessionCookieOptions(maxAge = ADMIN_SESSION_DURATION_SECONDS) {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax" as const,
    secure: true,
  };
}

async function createSession(userId: string, durationSeconds: number) {
  const secret = createOpaqueToken();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

  await (await getDb()).insert(authSessions).values({
    id,
    userId,
    tokenHash: await sha256(secret),
    expiresAt,
  });

  return `${id}.${secret}`;
}

export async function createAdminSession(userId: string) {
  return createSession(userId, ADMIN_SESSION_DURATION_SECONDS);
}

export async function createUserSession(userId: string) {
  return createSession(userId, USER_SESSION_DURATION_SECONDS);
}

export async function deleteCurrentSession(sessionToken: string | undefined) {
  if (!sessionToken) {
    return;
  }

  const [id, secret] = sessionToken.split(".");

  if (!id || !secret) {
    return;
  }

  await (await getDb()).delete(authSessions).where(and(
    eq(authSessions.id, id),
    eq(authSessions.tokenHash, await sha256(secret)),
  ));
}

async function getSessionUser(cookieName: string): Promise<AccountUser | null> {
  const sessionToken = (await cookies()).get(cookieName)?.value;

  if (!sessionToken) {
    return null;
  }

  const [id, secret] = sessionToken.split(".");

  if (!id || !secret) {
    return null;
  }

  const db = await getDb();
  const [record] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(
      eq(authSessions.id, id),
      eq(authSessions.tokenHash, await sha256(secret)),
      gt(authSessions.expiresAt, new Date().toISOString()),
    ))
    .limit(1);

  if (!record || !record.isActive || !["visitor", "advertiser", "admin"].includes(record.role)) {
    return null;
  }

  return record as AccountUser;
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const user = await getSessionUser(ADMIN_SESSION_COOKIE);
  return user?.role === "admin" ? { ...user, role: "admin" } : null;
}

export async function getCurrentUser() {
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
