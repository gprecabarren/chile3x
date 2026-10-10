import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountAuthEvents, accountXIdentities, users } from "@/db/schema";
import { isReservedAdminEmail } from "@/lib/admin-email";
import { createUserSession, getCurrentUser, getUserSessionCookieName, getUserSessionDuration, sessionCookieOptions } from "@/lib/auth";
import { createAccountReactivationIntent, ACCOUNT_REACTIVATION_COOKIE, ACCOUNT_REACTIVATION_DURATION_SECONDS } from "@/lib/account-reactivation";
import { GOOGLE_REGISTRATION_COOKIE } from "@/lib/google-registration";
import { APPLE_REGISTRATION_COOKIE } from "@/lib/apple-registration";
import { consumeXAuthAttempt, createXRegistrationIntent, getXAuthConfig } from "@/lib/x-auth";
import { exchangeXCode, X_AUTH_COOKIE, X_REGISTRATION_COOKIE } from "@/lib/x-oauth";
import { recordOperationalEvent } from "@/lib/operations";

export async function GET(request: NextRequest) {
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url), 303);
    response.cookies.delete({ name: X_AUTH_COOKIE, path: "/api/auth/x" });
    response.headers.set("cache-control", "no-store");
    response.headers.set("referrer-policy", "no-referrer");
    return response;
  };
  const attempt = await consumeXAuthAttempt(request.nextUrl.searchParams.get("state") ?? "", request.cookies.get(X_AUTH_COOKIE)?.value ?? "");
  if (!attempt) return redirect("/ingresar?error=x_state");
  const errorPath = attempt.intent === "register" ? "/registro" : "/ingresar";
  if (request.nextUrl.searchParams.has("error")) return redirect(`${errorPath}?error=x_cancelled`);
  const code = request.nextUrl.searchParams.get("code");
  const config = await getXAuthConfig();
  if (!config) return redirect(`${errorPath}?error=x_unavailable`);
  if (!code || code.length > 4_000) return redirect(`${errorPath}?error=x_invalid`);
  try {
    const identity = await exchangeXCode(code, attempt.codeVerifier, config);
    if (identity.email && await isReservedAdminEmail(identity.email)) return redirect(`${errorPath}?error=admin_email`);
    const db = await getDb();
    const [linked] = await db.select({ userId: accountXIdentities.userId }).from(accountXIdentities).where(eq(accountXIdentities.xSubject, identity.subject)).limit(1);
    if (attempt.intent === "link") {
      const user = await getCurrentUser();
      if (!user || user.id !== attempt.userId || user.role === "admin" || (linked && linked.userId !== user.id)) return redirect("/mi-cuenta/datos-personales?notice=unlink_error#accesos");
      const [other] = await db.select({ id: accountXIdentities.id }).from(accountXIdentities).where(eq(accountXIdentities.userId, user.id)).limit(1);
      if (other) return redirect("/mi-cuenta/datos-personales?notice=unlink_error#accesos");
      await db.batch([
        db.insert(accountXIdentities).values({ id: `x_identity_${crypto.randomUUID()}`, userId: user.id, xSubject: identity.subject, xUsername: identity.username }),
        db.insert(accountAuthEvents).values({ id: `auth_event_${crypto.randomUUID()}`, userId: user.id, provider: "x", action: "linked", createdAt: new Date().toISOString() }),
      ]);
      return redirect("/mi-cuenta/datos-personales?notice=provider_linked#accesos");
    }
    if (linked) {
      const [user] = await db.select().from(users).where(eq(users.id, linked.userId)).limit(1);
      if (!user || user.role === "admin" || user.adminDisabledAt || (!user.isActive && !user.selfDisabledAt)) return redirect(`${errorPath}?error=x_blocked`);
      if (await isReservedAdminEmail(user.email)) return redirect(`${errorPath}?error=admin_email`);
      if (user.selfDisabledAt) {
        const response = redirect(`/reactivar-cuenta?return_to=${encodeURIComponent(attempt.returnTo)}`);
        response.cookies.set({ name: ACCOUNT_REACTIVATION_COOKIE, value: await createAccountReactivationIntent(user.id), ...sessionCookieOptions(ACCOUNT_REACTIVATION_DURATION_SECONDS) });
        return response;
      }
      await db.update(accountXIdentities).set({ xUsername: identity.username, lastLoginAt: new Date().toISOString() }).where(eq(accountXIdentities.userId, user.id));
      const response = redirect(attempt.returnTo);
      response.cookies.set({ name: getUserSessionCookieName(), value: await createUserSession(user.id, request, "x"), ...sessionCookieOptions(getUserSessionDuration()) });
      return response;
    }
    // Never merge accounts solely by email. An existing account must authenticate
    // with its current method and explicitly link X inside its private panel.
    if (identity.email) {
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, identity.email)).limit(1);
      if (existing) return redirect(`${errorPath}?error=x_existing`);
    }
    const registration = await createXRegistrationIntent(identity);
    const response = redirect(`/registro?x_notice=new&return_to=${encodeURIComponent(attempt.returnTo)}`);
    response.cookies.set({ name: X_REGISTRATION_COOKIE, value: registration.value, ...sessionCookieOptions(registration.maxAge), path: "/" });
    response.cookies.delete({ name: GOOGLE_REGISTRATION_COOKIE, path: "/" });
    response.cookies.delete({ name: APPLE_REGISTRATION_COOKIE, path: "/" });
    return response;
  } catch {
    // Do not log authorization codes, access tokens, state or client secrets.
    await recordOperationalEvent({ category: "authentication", eventName: "x.sign_in", outcome: "failure", detail: "X no pudo completar el acceso. Revisa configuración o disponibilidad del proveedor." });
    return redirect(`${errorPath}?error=x_server`);
  }
}
