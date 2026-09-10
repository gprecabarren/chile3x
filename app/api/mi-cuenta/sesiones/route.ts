import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser, getUserSessionCookieName, sessionIdFromToken } from "@/lib/auth";
import { revokeOtherSessions, revokeOwnedSession } from "@/lib/session-management";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta", request.url), 303);
  const form = await request.formData();
  const action = form.get("action");
  const sessionId = typeof form.get("session_id") === "string" ? String(form.get("session_id")) : "";
  const currentId = sessionIdFromToken((await cookies()).get(getUserSessionCookieName())?.value);
  if (action === "revoke_others") await revokeOtherSessions(user.id, currentId);
  else if (action === "revoke_one") await revokeOwnedSession(user.id, sessionId);
  else return new Response("Acción no válida.", { status: 400 });
  if (sessionId && sessionId === currentId) {
    const response = NextResponse.redirect(new URL("/ingresar?closed=1", request.url), 303);
    response.cookies.delete({ name: getUserSessionCookieName(), path: "/" });
    return response;
  }
  return NextResponse.redirect(new URL("/mi-cuenta?session_notice=closed#sesiones", request.url), 303);
}
