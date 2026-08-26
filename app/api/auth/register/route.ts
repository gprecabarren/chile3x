import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, hashPassword, safeAccountReturnTo } from "@/lib/auth";
import { createAccountToken, sendAccountEmail } from "@/lib/account-email";
import { readAccountIdentity } from "@/lib/account-data";
import { encodeRegistrationState, registrationStateCookie, registrationStateFromForm } from "@/lib/registration-state";
import { TURNSTILE_AUTH_REGISTER_ACTION } from "@/lib/turnstile";
import { verifyTurnstile } from "@/lib/turnstile-server";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

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
  try {
    const formData = await request.formData();
    if (!await verifyTurnstile(request, formData.get("cf-turnstile-response"), TURNSTILE_AUTH_REGISTER_ACTION)) return redirectWithError(request, "antispam", formData);
    const displayName = getFormString(formData, "display_name").trim().slice(0, 80);
    const email = getFormString(formData, "email").trim().toLowerCase().slice(0, 160);
    const password = getFormString(formData, "password");
    const passwordConfirmation = getFormString(formData, "password_confirmation");
    const identity = readAccountIdentity(formData);

    if (formData.get("adult_confirmed") !== "yes") return redirectWithError(request, "adult", formData);
    if (displayName.length < 2) return redirectWithError(request, "display_name", formData);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return redirectWithError(request, "email", formData);
    if (!identity) return redirectWithError(request, "identity", formData);
    if (password.length < MIN_PASSWORD_LENGTH) return redirectWithError(request, "password", formData);
    if (password !== passwordConfirmation) return redirectWithError(request, "password_mismatch", formData);

    stage = "lookup";
    const db = await getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return redirectWithError(request, "duplicate", formData);
    if (identity.documentType === "rut" && identity.documentNumber) {
      const [existingRut] = await db.select({ id: users.id }).from(users).where(and(eq(users.documentType, "rut"), eq(users.documentNumber, identity.documentNumber))).limit(1);
      if (existingRut) return redirectWithError(request, "duplicate_rut", formData);
    }

    const userId = `usr_${crypto.randomUUID()}`;
    stage = "create_user";
    await db.insert(users).values({
      id: userId,
      email,
      displayName,
      passwordHash: await hashPassword(password),
      role: "visitor",
      firstName: identity.firstName || null,
      lastName: null,
      documentType: identity.documentType,
      documentNumber: identity.documentNumber,
      foreignCountry: identity.foreignCountry,
      birthDate: identity.birthDate,
      city: identity.city,
      phone: identity.phone || null,
    });

    stage = "send_verification";
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
    return redirectWithError(request, "server");
  }
}
