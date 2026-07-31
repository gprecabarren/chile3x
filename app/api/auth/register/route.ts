import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, hashPassword, safeAccountReturnTo } from "@/lib/auth";
import { createAccountToken, sendAccountEmail } from "@/lib/account-email";

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

  let stage = "form_data";
  try {
    const formData = await request.formData();
    const displayName = getFormString(formData, "display_name").trim().slice(0, 80);
    const email = getFormString(formData, "email").trim().toLowerCase().slice(0, 160);
    const password = getFormString(formData, "password");

    if (formData.get("adult_confirmed") !== "yes") return redirectWithError(request, "adult");
    if (displayName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) return redirectWithError(request, "invalid");

    stage = "lookup";
    const db = await getDb();
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return redirectWithError(request, "duplicate");

    const userId = `usr_${crypto.randomUUID()}`;
    stage = "create_user";
    await db.insert(users).values({ id: userId, email, displayName, passwordHash: await hashPassword(password), role: "visitor" });

    stage = "send_verification";
    const token = await createAccountToken(userId, "verify_email");
    const delivered = await sendAccountEmail({ email, displayName, purpose: "verify_email", token });
    const returnTo = safeAccountReturnTo(getFormString(formData, "return_to"));
    const url = new URL("/verificar-correo", request.url);
    url.searchParams.set("email", email);
    url.searchParams.set("return_to", returnTo);
    url.searchParams.set(delivered ? "sent" : "delivery", "1");
    return NextResponse.redirect(url, 303);
  } catch (error) {
    console.error("Account registration failed", { stage, error });
    return redirectWithError(request, "server");
  }
}
