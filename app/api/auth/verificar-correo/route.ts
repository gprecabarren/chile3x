import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/account-email";
import { getVerificationUser } from "@/lib/auth";
import { emailVerificationState } from "@/lib/email-verification-policy";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const verified = await verifyEmailToken(token);
  const user = verified ? await getVerificationUser() : null;
  const destination = verified && user && emailVerificationState(user) === "verified" ? "/mi-cuenta?notice=email_verified" : `/ingresar?${verified ? "verified=1" : "error=verification"}`;
  const response = NextResponse.redirect(new URL(destination, request.url), 303);
  response.headers.set("referrer-policy", "no-referrer");
  return response;
}
