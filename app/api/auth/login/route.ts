import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, createUserSession, getUserSessionCookieName, getUserSessionDuration, safeAccountReturnTo, sessionCookieOptions, verifyPassword } from "@/lib/auth";

function invalidCredentials(request: Request) {
  return NextResponse.redirect(new URL("/ingresar?error=invalid", request.url), 303);
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
  const email = getFormString(formData, "email").trim().toLowerCase().slice(0, 160);
  const password = getFormString(formData, "password");
  if (!email || !password) return invalidCredentials(request);

  const [user] = await (await getDb()).select({ id: users.id, passwordHash: users.passwordHash, emailVerifiedAt: users.emailVerifiedAt }).from(users).where(eq(users.email, email)).limit(1);
  if (!user || !await verifyPassword(password, user.passwordHash)) return invalidCredentials(request);
  if (!user.emailVerifiedAt) {
    const verificationUrl = new URL("/verificar-correo", request.url);
    verificationUrl.searchParams.set("email", email);
    verificationUrl.searchParams.set("return_to", safeAccountReturnTo(getFormString(formData, "return_to")));
    return NextResponse.redirect(verificationUrl, 303);
  }

  const returnTo = safeAccountReturnTo(getFormString(formData, "return_to"));
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set({ name: getUserSessionCookieName(), value: await createUserSession(user.id), ...sessionCookieOptions(getUserSessionDuration()) });
  return response;
}
