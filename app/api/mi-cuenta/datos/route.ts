import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { accountTokens, authSessions, users } from "@/db/schema";
import { readAccountIdentity } from "@/lib/account-data";
import { assertSameOrigin, getCurrentUser, hashPassword } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta/datos-personales", request.url), 303);

  const formData = await request.formData();
  const action = formData.get("action");
  const db = await getDb();

  if (action === "change_password") {
    const password = typeof formData.get("password") === "string" ? String(formData.get("password")) : "";
    const confirmation = typeof formData.get("password_confirmation") === "string" ? String(formData.get("password_confirmation")) : "";
    if (password.length < MIN_PASSWORD_LENGTH || password !== confirmation) {
      return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=password_error", request.url), 303);
    }
    const sessionToken = (await cookies()).get("chile3x_user_session")?.value;
    const currentSessionId = sessionToken?.split(".")[0];
    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id));
    if (currentSessionId) {
      await db.delete(authSessions).where(and(eq(authSessions.userId, user.id), ne(authSessions.id, currentSessionId)));
    }
    await db.delete(accountTokens).where(and(eq(accountTokens.userId, user.id), eq(accountTokens.purpose, "reset_password")));
    return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=password_saved", request.url), 303);
  }

  const [current] = await db.select({ birthDate: users.birthDate }).from(users).where(eq(users.id, user.id)).limit(1);
  const displayNameInput = formData.get("display_name");
  const displayName = typeof displayNameInput === "string" ? displayNameInput.trim().slice(0, 80) : "";
  const identity = readAccountIdentity(formData);
  if (!current || !identity || identity.birthDate !== current.birthDate || displayName.length < 2) {
    return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=error", request.url), 303);
  }
  await db.update(users).set({
    displayName,
    firstName: identity.firstName || null,
    lastName: null,
    documentType: identity.documentType,
    documentNumber: identity.documentNumber,
    foreignCountry: identity.foreignCountry,
    city: identity.city,
    phone: identity.phone || null,
  }).where(eq(users.id, user.id));
  return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=saved", request.url), 303);
}
