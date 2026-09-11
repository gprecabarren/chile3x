import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { authSessions, telegramAccountLinks, telegramOutboxJobs, users } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, getUserSessionCookieName, getUserSessionDuration, sessionCookieOptions } from "@/lib/auth";
import { createTelegramOutboxValues, dispatchTelegramJob } from "@/lib/telegram";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user || user.role === "admin") return new Response("No autorizado.", { status: 401 });
  const formData = await request.formData();
  if (formData.get("confirmation") !== "DESHABILITAR") {
    return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=disable_confirmation", request.url), 303);
  }

  const now = new Date().toISOString();
  const db = await getDb();
  const [telegramLink] = await db.select({ id: telegramAccountLinks.id, telegramUserId: telegramAccountLinks.telegramUserId }).from(telegramAccountLinks).where(eq(telegramAccountLinks.userId, user.id)).limit(1);
  const telegramJob = telegramLink ? createTelegramOutboxValues({ kind: "revoke_member", userId: user.id, entityId: telegramLink.id, payload: { userId: user.id, telegramUserId: telegramLink.telegramUserId, reason: "Cuenta deshabilitada por la persona." } }) : null;
  if (telegramLink && telegramJob) {
    await db.batch([
      db.update(users).set({ selfDisabledAt: now, isActive: false }).where(eq(users.id, user.id)),
      db.delete(authSessions).where(eq(authSessions.userId, user.id)),
      db.update(telegramAccountLinks).set({ status: "revoked", revokedAt: now, revokeReason: "Cuenta deshabilitada por la persona.", updatedAt: now }).where(eq(telegramAccountLinks.id, telegramLink.id)),
      db.insert(telegramOutboxJobs).values(telegramJob),
    ]);
    await dispatchTelegramJob(telegramJob.id);
  } else {
    await db.batch([
      db.update(users).set({ selfDisabledAt: now, isActive: false }).where(eq(users.id, user.id)),
      db.delete(authSessions).where(eq(authSessions.userId, user.id)),
    ]);
  }
  const response = NextResponse.redirect(new URL("/ingresar?closed=disabled", request.url), 303);
  response.cookies.set({ name: getUserSessionCookieName(), value: "", ...sessionCookieOptions(getUserSessionDuration()), maxAge: 0 });
  return response;
}
