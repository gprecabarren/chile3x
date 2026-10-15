import { NextResponse } from "next/server";
import { assertSameOrigin, createOpaqueToken, sessionCookieOptions } from "@/lib/auth";
import { BROWSER_SESSION_COOKIE, browserSessionKey } from "@/lib/session-policy";

export async function POST(request: Request) {
  const headers = { "cache-control": "private, no-store, max-age=0", "x-robots-tag": "noindex, nofollow" };
  try { assertSameOrigin(request); } catch { return NextResponse.json({ message: "Solicitud no válida." }, { status: 403, headers }); }
  if (browserSessionKey(request.headers.get("cookie"))) return NextResponse.json({ ready: true }, { headers });
  if (request.headers.get("x-chile3x-browser-check") !== "prepare") return NextResponse.json({ message: "No se pudieron confirmar las cookies necesarias. Permítelas y vuelve a intentarlo." }, { status: 409, headers });
  const response = NextResponse.json({ ready: false }, { headers });
  response.cookies.set({ name: BROWSER_SESSION_COOKIE, value: createOpaqueToken(), ...sessionCookieOptions(60 * 60 * 24 * 30) });
  return response;
}
