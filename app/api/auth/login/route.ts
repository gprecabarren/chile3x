import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, createUserSession, setUserSessionCookie, safeAccountReturnTo, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { TURNSTILE_AUTH_LOGIN_ACTION } from "@/lib/turnstile";
import { verifyTurnstile } from "@/lib/turnstile-server";
import { ACCOUNT_REACTIVATION_COOKIE, ACCOUNT_REACTIVATION_DURATION_SECONDS, createAccountReactivationIntent } from "@/lib/account-reactivation";
import { emailVerificationState } from "@/lib/email-verification-policy";
import { isReservedAdminEmail, isReservedPublicAccountIdentity } from "@/lib/admin-email";
import { LOGIN_EMAIL_COOKIE, LOGIN_EMAIL_LIFETIME, loginEmail, validLoginEmail } from "@/lib/login-form-state";
import { LOGIN_DUMMY_PASSWORD_HASH } from "@/lib/password-policy";

function loginError(request: Request, formData: FormData, error = "invalid") {
  const url = new URL("/ingresar", request.url);
  url.searchParams.set("error", error);
  url.searchParams.set("return_to", safeAccountReturnTo(getFormString(formData, "return_to")));
  const response = NextResponse.redirect(url, 303);
  // Keep only the email for a short retry. Never put it or the password in
  // redirect URLs, access logs, persistent client storage or the response body.
  response.cookies.set({ name: LOGIN_EMAIL_COOKIE, value: loginEmail(getFormString(formData, "email")), ...sessionCookieOptions(LOGIN_EMAIL_LIFETIME), path: "/ingresar" });
  return response;
}

function getFormString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const formData = await request.formData();
  const email = loginEmail(getFormString(formData, "email"));
  const password = getFormString(formData, "password");
  if (!validLoginEmail(email)) return loginError(request, formData, "email_format");
  if (!password) return loginError(request, formData, "password_required");
  if (!await verifyTurnstile(request, formData.get("cf-turnstile-response"), TURNSTILE_AUTH_LOGIN_ACTION)) return loginError(request, formData, "antispam");
  if (await isReservedAdminEmail(email)) return loginError(request, formData, "admin_email");

  const [user] = await (await getDb()).select({ id: users.id, role: users.role, createdAt: users.createdAt, passwordHash: users.passwordHash, emailVerifiedAt: users.emailVerifiedAt, emailVerificationDeadline: users.emailVerificationDeadline, emailVerificationExemptAt: users.emailVerificationExemptAt, isActive: users.isActive, selfDisabledAt: users.selfDisabledAt, adminDisabledAt: users.adminDisabledAt }).from(users).where(eq(users.email, email)).limit(1);
  const passwordCorrect = await verifyPassword(password, user?.passwordHash || LOGIN_DUMMY_PASSWORD_HASH);
  if (!user) return loginError(request, formData, "email_unknown");
  if (!user.passwordHash || !passwordCorrect) return loginError(request, formData, "password_incorrect");
  if (user.role === "admin") return loginError(request, formData, "admin_email");
  if (await isReservedPublicAccountIdentity(user.id)) return loginError(request, formData, "admin_email");
  if (user.adminDisabledAt) return loginError(request, formData, "admin_disabled");
  if (user.selfDisabledAt) {
    const returnTo = safeAccountReturnTo(getFormString(formData, "return_to"));
    const destination = new URL("/reactivar-cuenta", request.url);
    destination.searchParams.set("return_to", returnTo);
    const response = NextResponse.redirect(destination, 303);
    response.cookies.set({ name: ACCOUNT_REACTIVATION_COOKIE, value: await createAccountReactivationIntent(user.id), ...sessionCookieOptions(ACCOUNT_REACTIVATION_DURATION_SECONDS) });
    response.cookies.set({ name: LOGIN_EMAIL_COOKIE, value: "", ...sessionCookieOptions(0), path: "/ingresar" });
    return response;
  }
  if (!user.isActive) return loginError(request, formData, "admin_disabled");
  const returnTo = safeAccountReturnTo(getFormString(formData, "return_to"));
  const blocked = emailVerificationState(user) === "blocked";
  const destination = new URL(blocked ? "/verificar-correo" : returnTo, request.url);
  if (blocked) destination.searchParams.set("return_to", returnTo);
  // A blocked session is restricted to verifying/logout, never normal actions.
  const response = NextResponse.redirect(destination, 303);
  setUserSessionCookie(response, await createUserSession(user.id, request, "password"));
  response.cookies.set({ name: LOGIN_EMAIL_COOKIE, value: "", ...sessionCookieOptions(0), path: "/ingresar" });
  return response;
}
