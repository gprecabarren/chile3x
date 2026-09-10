import { and, desc, eq, gt, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { authSessions } from "@/db/schema";
import { sessionIdFromToken } from "@/lib/auth";
import { describeUserAgent, sessionLocation } from "@/lib/session-context";

const authMethodLabels = {
  password: "Correo y contraseña",
  google: "Google",
  github: "GitHub",
  reactivation: "Restablecimiento de cuenta",
  unknown: "Método anterior",
} as const;

function asUtcInstant(value: string) {
  if (value.includes("T")) return value;
  return `${value.replace(" ", "T")}Z`;
}

export function sessionDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(new Date(asUtcInstant(value)));
}

export async function getAccountSessions(userId: string, cookieName: string) {
  const currentId = sessionIdFromToken((await cookies()).get(cookieName)?.value);
  const rows = await (await getDb()).select({
    id: authSessions.id,
    authMethod: authSessions.authMethod,
    ipAddress: authSessions.ipAddress,
    userAgent: authSessions.userAgent,
    countryCode: authSessions.countryCode,
    region: authSessions.region,
    city: authSessions.city,
    timezone: authSessions.timezone,
    lastSeenAt: authSessions.lastSeenAt,
    expiresAt: authSessions.expiresAt,
    createdAt: authSessions.createdAt,
  }).from(authSessions).where(and(
    eq(authSessions.userId, userId),
    gt(authSessions.expiresAt, new Date().toISOString()),
  )).orderBy(desc(authSessions.lastSeenAt), desc(authSessions.createdAt));

  return rows.map((row) => {
    const agent = describeUserAgent(row.userAgent);
    return {
      ...row,
      isCurrent: row.id === currentId,
      device: agent.device,
      deviceLabel: agent.label,
      location: sessionLocation(row),
      authMethodLabel: authMethodLabels[row.authMethod],
      createdLabel: sessionDate(row.createdAt),
      lastSeenLabel: sessionDate(row.lastSeenAt),
      expiresLabel: sessionDate(row.expiresAt),
    };
  });
}

export async function revokeOwnedSession(userId: string, sessionId: string) {
  if (!sessionId || sessionId.length > 100) return false;
  const result = await (await getDb()).delete(authSessions).where(and(
    eq(authSessions.id, sessionId),
    eq(authSessions.userId, userId),
  )).returning({ id: authSessions.id });
  return result.length > 0;
}

export async function revokeOtherSessions(userId: string, currentSessionId: string | null) {
  const db = await getDb();
  if (!currentSessionId) {
    const result = await db.delete(authSessions).where(eq(authSessions.userId, userId)).returning({ id: authSessions.id });
    return result.length;
  }
  const result = await db.delete(authSessions).where(and(
    eq(authSessions.userId, userId),
    ne(authSessions.id, currentSessionId),
  )).returning({ id: authSessions.id });
  return result.length;
}
