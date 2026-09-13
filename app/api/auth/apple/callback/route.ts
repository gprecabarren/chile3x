import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountAppleIdentities, accountGoogleIdentities, users } from "@/db/schema";
import { isReservedAdminEmail } from "@/lib/admin-email";
import { consumeAppleAuthAttempt } from "@/lib/apple-auth-flow";
import { createAppleRegistrationIntent, APPLE_REGISTRATION_COOKIE } from "@/lib/apple-registration";
import { encryptAppleRefreshToken, exchangeAppleAuthorizationCode, verifyAppleIdentity } from "@/lib/apple-oauth";
import { ACCOUNT_REACTIVATION_COOKIE, ACCOUNT_REACTIVATION_DURATION_SECONDS, createAccountReactivationIntent } from "@/lib/account-reactivation";
import { createUserSession, getUserSessionCookieName, getUserSessionDuration, sessionCookieOptions } from "@/lib/auth";
import { GOOGLE_REGISTRATION_COOKIE } from "@/lib/google-registration";
import { recordOperationalEvent } from "@/lib/operations";
import { getSiteSettings } from "@/lib/site-settings";

function destination(request: Request, intent: "login" | "register", returnTo: string, error?: string, notice?: string) {
  const url = new URL(intent === "register" ? "/registro" : "/ingresar", request.url);
  url.searchParams.set("return_to", returnTo);
  if (error) url.searchParams.set("error", error);
  if (notice) url.searchParams.set("apple_notice", notice);
  return url;
}

function parseName(value: FormDataEntryValue | null, email: string) {
  let fullName = "";
  if (typeof value === "string" && value.length <= 4_000) {
    try {
      const parsed = JSON.parse(value) as { name?: { firstName?: unknown; lastName?: unknown } };
      const first = typeof parsed.name?.firstName === "string" ? parsed.name.firstName.trim() : "";
      const last = typeof parsed.name?.lastName === "string" ? parsed.name.lastName.trim() : "";
      fullName = `${first} ${last}`.trim().replace(/\s+/g, " ").slice(0, 160);
    } catch {
      // Apple sends this optional field only on the first authorization.
    }
  }
  return { fullName, displayName: fullName.slice(0, 80) || email.split("@")[0].slice(0, 80) };
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.redirect(new URL("/ingresar?error=apple_invalid", request.url), 303);
  }
  const state = formData.get("state");
  const attempt = typeof state === "string" ? await consumeAppleAuthAttempt(state) : null;
  if (!attempt) return NextResponse.redirect(new URL("/ingresar?error=apple_state", request.url), 303);
  if (formData.get("error") === "user_cancelled_authorize") return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "apple_cancelled"), 303);
  const code = formData.get("code");
  if (typeof code !== "string" || !code || code.length > 4_000) return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "apple_invalid"), 303);

  try {
    const settings = await getSiteSettings();
    const { env } = await import("cloudflare:workers");
    const privateKey = env.APPLE_PRIVATE_KEY?.trim() ?? "";
    const encryptionKey = env.APPLE_TOKEN_ENCRYPTION_KEY?.trim() ?? "";
    if (settings.apple_sign_in_status !== "enabled" || !settings.apple_services_id || !settings.apple_team_id || !settings.apple_key_id || !privateKey || !encryptionKey) {
      return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "apple_unavailable"), 303);
    }
    const redirectUri = `${new URL(request.url).origin}/api/auth/apple/callback`;
    const tokenResult = await exchangeAppleAuthorizationCode(code, {
      servicesId: settings.apple_services_id,
      teamId: settings.apple_team_id,
      keyId: settings.apple_key_id,
      privateKey,
      redirectUri,
    });
    const identity = await verifyAppleIdentity(tokenResult.identityToken, settings.apple_services_id, attempt.nonce);
    if (!identity) return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "apple_invalid"), 303);
    if (await isReservedAdminEmail(identity.email)) return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "apple_admin_email"), 303);
    const encryptedRefreshToken = await encryptAppleRefreshToken(tokenResult.refreshToken, encryptionKey);
    const db = await getDb();
    const [linked] = await db.select({
      identityId: accountAppleIdentities.id,
      userId: users.id,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      selfDisabledAt: users.selfDisabledAt,
      adminDisabledAt: users.adminDisabledAt,
    }).from(accountAppleIdentities).innerJoin(users, eq(accountAppleIdentities.userId, users.id))
      .where(eq(accountAppleIdentities.appleSubject, identity.subject)).limit(1);

    let account = linked;
    if (!account) {
      const [byEmail] = await db.select({ id: users.id, email: users.email, role: users.role, isActive: users.isActive, selfDisabledAt: users.selfDisabledAt, adminDisabledAt: users.adminDisabledAt })
        .from(users).where(eq(users.email, identity.email)).limit(1);
      if (byEmail?.role === "admin") return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "apple_admin_email"), 303);
      if (byEmail) {
        const [[googleIdentity], [otherAppleIdentity]] = await Promise.all([
          db.select({ id: accountGoogleIdentities.id }).from(accountGoogleIdentities).where(eq(accountGoogleIdentities.userId, byEmail.id)).limit(1),
          db.select({ id: accountAppleIdentities.id }).from(accountAppleIdentities).where(eq(accountAppleIdentities.userId, byEmail.id)).limit(1),
        ]);
        if (googleIdentity) return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "apple_conflict_google"), 303);
        if (otherAppleIdentity) return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "apple_conflict"), 303);
        const identityId = `apple_identity_${crypto.randomUUID()}`;
        await db.insert(accountAppleIdentities).values({ id: identityId, userId: byEmail.id, appleSubject: identity.subject, appleEmail: identity.email, refreshTokenEncrypted: encryptedRefreshToken });
        account = { identityId, userId: byEmail.id, email: byEmail.email, role: byEmail.role, isActive: byEmail.isActive, selfDisabledAt: byEmail.selfDisabledAt, adminDisabledAt: byEmail.adminDisabledAt };
      }
    }

    if (account) {
      if (account.role === "admin") return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "apple_admin_email"), 303);
      if (account.adminDisabledAt) return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "admin_disabled"), 303);
      if (account.selfDisabledAt) {
        const response = NextResponse.redirect(new URL(`/reactivar-cuenta?return_to=${encodeURIComponent(attempt.returnTo)}`, request.url), 303);
        response.cookies.set({ name: ACCOUNT_REACTIVATION_COOKIE, value: await createAccountReactivationIntent(account.userId), ...sessionCookieOptions(ACCOUNT_REACTIVATION_DURATION_SECONDS) });
        return response;
      }
      if (!account.isActive) return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "admin_disabled"), 303);
      const now = new Date().toISOString();
      await db.update(accountAppleIdentities).set({ appleEmail: identity.email, lastLoginAt: now, ...(encryptedRefreshToken ? { refreshTokenEncrypted: encryptedRefreshToken } : {}) }).where(eq(accountAppleIdentities.id, account.identityId));
      await db.update(users).set({ emailVerifiedAt: now }).where(and(eq(users.id, account.userId), eq(users.email, identity.email)));
      const response = NextResponse.redirect(new URL(attempt.returnTo, request.url), 303);
      response.cookies.set({ name: getUserSessionCookieName(), value: await createUserSession(account.userId, request, "apple"), ...sessionCookieOptions(getUserSessionDuration()) });
      return response;
    }

    const names = parseName(formData.get("user"), identity.email);
    const registration = await createAppleRegistrationIntent({ ...identity, ...names, refreshTokenEncrypted: encryptedRefreshToken });
    const response = NextResponse.redirect(destination(request, "register", attempt.returnTo, undefined, attempt.intent === "login" ? "new" : undefined), 303);
    response.cookies.set({ name: APPLE_REGISTRATION_COOKIE, value: registration.value, ...sessionCookieOptions(registration.maxAge), path: "/" });
    response.cookies.delete({ name: GOOGLE_REGISTRATION_COOKIE, path: "/" });
    return response;
  } catch (error) {
    console.error("Apple sign-in failed", { error });
    await recordOperationalEvent({ category: "authentication", eventName: "apple.sign_in", outcome: "failure", detail: "El proveedor de acceso con Apple no pudo completar la operación." });
    return NextResponse.redirect(destination(request, attempt.intent, attempt.returnTo, "apple_server"), 303);
  }
}

