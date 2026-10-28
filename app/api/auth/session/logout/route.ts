import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  deleteBrowserSessions,
  clearSessionCookies,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  await deleteBrowserSessions(request);
  const response = NextResponse.redirect(new URL("/ingresar?closed=1", request.url), 303);
  response.headers.set("cache-control", "no-store");
  clearSessionCookies(response);
  return response;
}
