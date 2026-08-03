import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin } from "@/lib/auth";
import { createAccountToken, sendAccountEmail } from "@/lib/account-email";
import { TURNSTILE_AUTH_EMAIL_ACTION } from "@/lib/turnstile";
import { verifyTurnstile } from "@/lib/turnstile-server";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const formData = await request.formData();
  if (!await verifyTurnstile(request, formData.get("cf-turnstile-response"), TURNSTILE_AUTH_EMAIL_ACTION)) return NextResponse.redirect(new URL("/recuperar-clave?error=antispam", request.url), 303);
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim().toLowerCase().slice(0, 160) : "";
  const [user] = await (await getDb()).select({ id: users.id, email: users.email, displayName: users.displayName }).from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    const token = await createAccountToken(user.id, "reset_password");
    await sendAccountEmail({ email: user.email, displayName: user.displayName, purpose: "reset_password", token });
  }
  return NextResponse.redirect(new URL("/recuperar-clave?sent=1", request.url), 303);
}
