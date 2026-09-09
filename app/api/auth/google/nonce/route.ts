import { NextResponse } from "next/server";
import { createOpaqueToken, sessionCookieOptions } from "@/lib/auth";
import { GOOGLE_NONCE_COOKIE } from "@/lib/google-auth";

export async function GET() {
  const nonce = createOpaqueToken();
  const response = NextResponse.json({ nonce }, { headers: { "cache-control": "no-store" } });
  response.cookies.set({
    name: GOOGLE_NONCE_COOKIE,
    value: nonce,
    ...sessionCookieOptions(10 * 60),
    path: "/api/auth/google",
  });
  return response;
}
