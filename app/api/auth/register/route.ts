import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import {
  assertSameOrigin,
  createUserSession,
  getUserSessionCookieName,
  getUserSessionDuration,
  hashPassword,
  safeAccountReturnTo,
  sessionCookieOptions,
} from "@/lib/auth";

function redirectWithError(request: Request, error: string) {
  const url = new URL("/registro", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
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
  const displayName = getFormString(formData, "display_name").trim().slice(0, 80);
  const email = getFormString(formData, "email").trim().toLowerCase().slice(0, 160);
  const password = getFormString(formData, "password");

  if (formData.get("adult_confirmed") !== "yes") {
    return redirectWithError(request, "adult");
  }

  if (displayName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    return redirectWithError(request, "invalid");
  }

  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return redirectWithError(request, "duplicate");
  }

  const userId = `usr_${crypto.randomUUID()}`;
  await db.insert(users).values({ id: userId, email, displayName, passwordHash: await hashPassword(password), role: "visitor" });

  const returnTo = safeAccountReturnTo(getFormString(formData, "return_to"));
  const response = NextResponse.redirect(new URL(`${returnTo}?welcome=1`, request.url), 303);
  response.cookies.set({
    name: getUserSessionCookieName(),
    value: await createUserSession(userId),
    ...sessionCookieOptions(getUserSessionDuration()),
  });
  return response;
}
