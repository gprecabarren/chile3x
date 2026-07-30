import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { authSessions, users } from "@/db/schema";

const SESSION_COOKIE = "chile3x_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

type RuntimeAuthEnv = {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

export type AdminUser = {
  id: string;
  email: string;
  displayName: string | null;
  role: "admin";
};

function toBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
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

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: true,
  };
}

export async function createAdminSession(userId: string) {
  const secret = createOpaqueToken();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

  await (await getDb()).insert(authSessions).values({
    id,
    userId,
    tokenHash: await sha256(secret),
    expiresAt,
  });

  return `${id}.${secret}`;
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

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const sessionToken = (await cookies()).get(SESSION_COOKIE)?.value;

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
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(and(
      eq(authSessions.id, id),
      eq(authSessions.tokenHash, await sha256(secret)),
      gt(authSessions.expiresAt, new Date().toISOString()),
      eq(users.role, "admin"),
    ))
    .limit(1);

  if (!record || record.role !== "admin") {
    return null;
  }

  return record;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;

  if (!origin || origin !== expectedOrigin) {
    throw new Error("Invalid request origin");
  }
}
