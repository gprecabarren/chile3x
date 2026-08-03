import { eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, safeAccountReturnTo } from "@/lib/auth";
import { createAccountToken, sendAccountEmail } from "@/lib/account-email";
import { TURNSTILE_AUTH_EMAIL_ACTION } from "@/lib/turnstile";
import { verifyTurnstile } from "@/lib/turnstile-server";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const formData = await request.formData();
  if (!await verifyTurnstile(request, formData.get("cf-turnstile-response"), TURNSTILE_AUTH_EMAIL_ACTION)) return NextResponse.redirect(new URL("/verificar-correo?error=antispam", request.url), 303);
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim().toLowerCase().slice(0, 160) : "";
  const returnTo = safeAccountReturnTo(typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : null);
  const [user] = await (await getDb()).select({ id: users.id, email: users.email, displayName: users.displayName }).from(users).where(isNull(users.emailVerifiedAt) && eq(users.email, email)).limit(1);
  if (user) {
    const token = await createAccountToken(user.id, "verify_email");
    await sendAccountEmail({ email: user.email, displayName: user.displayName, purpose: "verify_email", token });
  }
  const url = new URL("/verificar-correo", request.url);
  url.searchParams.set("email", email);
  url.searchParams.set("return_to", returnTo);
  url.searchParams.set("resent", "1");
  return NextResponse.redirect(url, 303);
}
