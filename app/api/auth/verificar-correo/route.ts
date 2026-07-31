import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/account-email";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const verified = await verifyEmailToken(token);
  return NextResponse.redirect(new URL(`/ingresar?${verified ? "verified=1" : "error=verification"}`, request.url), 303);
}
