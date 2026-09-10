import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountGoogleIdentities, users } from "@/db/schema";
import { assertSameOrigin, createUserSession, getUserSessionCookieName, getUserSessionDuration, hashPassword, safeAccountReturnTo, sessionCookieOptions } from "@/lib/auth";
import { createAccountToken, sendAccountEmail } from "@/lib/account-email";
import { readAccountIdentity } from "@/lib/account-data";
import { encodeRegistrationState, registrationStateCookie, registrationStateFromForm } from "@/lib/registration-state";
import { TURNSTILE_AUTH_REGISTER_ACTION } from "@/lib/turnstile";
import { verifyTurnstile } from "@/lib/turnstile-server";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { generateUniqueAccountUsername } from "@/lib/account-username";
import { isReservedAdminEmail } from "@/lib/admin-email";
import { consumeGoogleRegistrationIntent, GOOGLE_REGISTRATION_COOKIE, readGoogleRegistrationIntent } from "@/lib/google-registration";
import { recordOperationalEvent } from "@/lib/operations";

function redirectWithError(request: Request, error: string, formData?: FormData) {
  const url = new URL("/registro", request.url);
  url.searchParams.set("error", error);
  if (formData) url.searchParams.set("return_to", safeAccountReturnTo(getFormString(formData, "return_to")));
  const response = NextResponse.redirect(url, 303);
  if (formData) {
    response.cookies.set(registrationStateCookie, encodeRegistrationState(registrationStateFromForm(formData)), {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      maxAge: 10 * 60,
      path: "/registro",
    });
  }
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

  let stage = "form_data";
  let formData: FormData | undefined;
  let createdEmail: string | undefined;
  let googleRegistration = null as Awaited<ReturnType<typeof readGoogleRegistrationIntent>>;
  try {
    formData = await request.formData();
    googleRegistration = await readGoogleRegistrationIntent(request.cookies.get(GOOGLE_REGISTRATION_COOKIE)?.value);
    if (!await verifyTurnstile(request, formData.get("cf-turnstile-response"), TURNSTILE_AUTH_REGISTER_ACTION)) return redirectWithError(request, "antispam", formData);
    const displayName = getFormString(formData, "display_name").trim().slice(0, 80);
    const email = (googleRegistration?.email ?? getFormString(formData, "email")).trim().toLowerCase().slice(0, 160);
    const password = getFormString(formData, "password");
    const passwordConfirmation = getFormString(formData, "password_confirmation");
    const identity = readAccountIdentity(formData);

    if (formData.get("adult_confirmed") !== "yes") return redirectWithError(request, "adult", formData);
    if (formData.get("legal_confirmed") !== "yes") return redirectWithError(request, "legal", formData);
    if (displayName.length < 2) return redirectWithError(request, "display_name", formData);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return redirectWithError(request, "email", formData);
    if (!identity) return redirectWithError(request, "identity", formData);
    if (!googleRegistration && password.length < MIN_PASSWORD_LENGTH) return redirectWithError(request, "password", formData);
    if (!googleRegistration && password !== passwordConfirmation) return redirectWithError(request, "password_mismatch", formData);

    stage = "lookup";
    const db = await getDb();
    if (await isReservedAdminEmail(email)) return redirectWithError(request, "admin_email", formData);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return redirectWithError(request, "duplicate", formData);
    if (identity.documentType === "rut" && identity.documentNumber) {
      const [existingRut] = await db.select({ id: users.id }).from(users).where(and(eq(users.documentType, "rut"), eq(users.documentNumber, identity.documentNumber))).limit(1);
      if (existingRut) return redirectWithError(request, "duplicate_rut", formData);
    }

    const userId = `usr_${crypto.randomUUID()}`;
    const username = await generateUniqueAccountUsername(displayName);
    stage = "create_user";
    await db.insert(users).values({
      id: userId,
      email,
      username,
      displayName,
      passwordHash: googleRegistration ? null : await hashPassword(password),
      role: "visitor",
      firstName: identity.firstName || null,
      lastName: null,
      documentType: identity.documentType,
      documentNumber: identity.documentNumber,
      foreignCountry: identity.foreignCountry,
      birthDate: identity.birthDate,
      city: identity.city,
      phone: identity.phone || null,
      emailVerifiedAt: googleRegistration ? new Date().toISOString() : null,
    });

    if (googleRegistration) {
      await db.insert(accountGoogleIdentities).values({
        id: `google_identity_${crypto.randomUUID()}`,
        userId,
        googleSubject: googleRegistration.subject,
        googleEmail: googleRegistration.email,
      });
      await consumeGoogleRegistrationIntent(googleRegistration.id);
      const response = NextResponse.redirect(new URL(safeAccountReturnTo(getFormString(formData, "return_to")), request.url), 303);
      response.cookies.set({ name: getUserSessionCookieName(), value: await createUserSession(userId, request, "google"), ...sessionCookieOptions(getUserSessionDuration()) });
      response.cookies.delete({ name: GOOGLE_REGISTRATION_COOKIE, path: "/" });
      response.cookies.set(registrationStateCookie, "", { maxAge: 0, path: "/registro" });
      return response;
    }

    stage = "send_verification";
    createdEmail = email;
    const token = await createAccountToken(userId, "verify_email");
    const delivered = await sendAccountEmail({ email, displayName, purpose: "verify_email", token });
    const returnTo = safeAccountReturnTo(getFormString(formData, "return_to"));
    const url = new URL("/verificar-correo", request.url);
    url.searchParams.set("email", email);
    url.searchParams.set("return_to", returnTo);
    url.searchParams.set("created", "1");
    url.searchParams.set(delivered ? "sent" : "delivery", "1");
    const response = NextResponse.redirect(url, 303);
    response.cookies.set(registrationStateCookie, "", { maxAge: 0, path: "/registro" });
    return response;
  } catch (error) {
    console.error("Account registration failed", { stage, error });
    await recordOperationalEvent({ category: "application", eventName: "account.registration", outcome: "failure", detail: "El registro de cuenta no pudo completar una etapa interna.", metadata: { stage } });
    // If the account was saved, let the user retry sending verification rather
    // than asking them to register again (which would report a duplicate).
    if (createdEmail && formData && !googleRegistration) {
      const url = new URL("/verificar-correo", request.url);
      url.searchParams.set("email", createdEmail);
      url.searchParams.set("return_to", safeAccountReturnTo(getFormString(formData, "return_to")));
      url.searchParams.set("created", "1");
      url.searchParams.set("delivery", "1");
      const response = NextResponse.redirect(url, 303);
      response.cookies.set(registrationStateCookie, "", { maxAge: 0, path: "/registro" });
      return response;
    }
    return redirectWithError(request, "server", formData);
  }
}
