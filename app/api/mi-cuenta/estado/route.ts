import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { authSessions, users } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, getUserSessionCookieName, getUserSessionDuration, sessionCookieOptions } from "@/lib/auth";

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
  await db.update(users).set({ selfDisabledAt: now, isActive: false }).where(eq(users.id, user.id));
  await db.delete(authSessions).where(eq(authSessions.userId, user.id));
  const response = NextResponse.redirect(new URL("/ingresar?closed=disabled", request.url), 303);
  response.cookies.set({ name: getUserSessionCookieName(), value: "", ...sessionCookieOptions(getUserSessionDuration()), maxAge: 0 });
  return response;
}
