import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountTokens, users } from "@/db/schema";
import { ACCOUNT_REACTIVATION_COOKIE, readAccountReactivationIntent } from "@/lib/account-reactivation";
import { assertSameOrigin, createUserSession, getUserSessionCookieName, getUserSessionDuration, safeAccountReturnTo, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const formData = await request.formData();
  const returnTo = safeAccountReturnTo(typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : null);
  if (formData.get("confirm") !== "yes") return NextResponse.redirect(new URL(`/reactivar-cuenta?return_to=${encodeURIComponent(returnTo)}`, request.url), 303);
  const cookieValue = request.cookies.get(ACCOUNT_REACTIVATION_COOKIE)?.value;
  const intent = await readAccountReactivationIntent(cookieValue);
  if (!intent || intent.adminDisabledAt || !intent.selfDisabledAt) return NextResponse.redirect(new URL(`/ingresar?error=${intent?.adminDisabledAt ? "admin_disabled" : "verification"}&return_to=${encodeURIComponent(returnTo)}`, request.url), 303);

  const db = await getDb();
  const now = new Date().toISOString();
  await db.update(users).set({ selfDisabledAt: null, isActive: true }).where(and(eq(users.id, intent.userId), isNull(users.adminDisabledAt)));
  await db.update(accountTokens).set({ usedAt: now }).where(eq(accountTokens.id, intent.tokenId));
  const response = NextResponse.redirect(new URL(`${returnTo}${returnTo.includes("?") ? "&" : "?"}notice=reactivated`, request.url), 303);
  response.cookies.set({ name: getUserSessionCookieName(), value: await createUserSession(intent.userId), ...sessionCookieOptions(getUserSessionDuration()) });
  response.cookies.set({ name: ACCOUNT_REACTIVATION_COOKIE, value: "", ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}
