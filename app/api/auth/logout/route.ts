import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  deleteCurrentSession,
  getSessionCookieName,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  await deleteCurrentSession(request.cookies.get(getSessionCookieName())?.value);
  const response = NextResponse.redirect(new URL("/ingresar?closed=admin", request.url), 303);
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
