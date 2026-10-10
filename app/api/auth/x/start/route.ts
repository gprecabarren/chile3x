import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, getCurrentUser, safeAccountReturnTo, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { createXAuthAttempt, getXAuthConfig } from "@/lib/x-auth";
import { X_AUTH_COOKIE, xAuthorizationUrl } from "@/lib/x-oauth";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const form = await request.formData();
  const config = await getXAuthConfig();
  const intent = form.get("intent") === "link" ? "link" : form.get("intent") === "register" ? "register" : "login";
  if (!config) return NextResponse.redirect(new URL(`${intent === "register" ? "/registro" : "/ingresar"}?error=x_unavailable`, request.url), 303);
  let userId: string | undefined;
  if (intent === "link") {
    const user = await getCurrentUser();
    if (!user || user.role === "admin") return new Response("No autorizado.", { status: 403 });
    const [account] = await (await getDb()).select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    const password = String(form.get("current_password") ?? "");
    if (password.length > 256 || !account?.passwordHash || !await verifyPassword(password, account.passwordHash)) return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=unlink_password#accesos", request.url), 303);
    userId = user.id;
  }
  const attempt = await createXAuthAttempt(intent, safeAccountReturnTo(String(form.get("return_to") ?? "")), userId);
  const response = NextResponse.redirect(xAuthorizationUrl(config, attempt.state, attempt.challenge), 303);
  response.cookies.set({ name: X_AUTH_COOKIE, value: attempt.browser, ...sessionCookieOptions(600), path: "/api/auth/x" });
  response.headers.set("cache-control", "no-store");
  return response;
}
