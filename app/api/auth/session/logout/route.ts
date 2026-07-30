import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  deleteCurrentSession,
  getUserSessionCookieName,
  getUserSessionDuration,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  await deleteCurrentSession(request.cookies.get(getUserSessionCookieName())?.value);
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set({ name: getUserSessionCookieName(), value: "", ...sessionCookieOptions(getUserSessionDuration()), maxAge: 0 });
  return response;
}
