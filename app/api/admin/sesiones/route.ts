import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentAdmin, getSessionCookieName, sessionIdFromToken } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { revokeOtherSessions, revokeOwnedSession } from "@/lib/session-management";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.redirect(new URL("/api/auth/github/start?return_to=/admin", request.url), 303);
  const form = await request.formData();
  const action = form.get("action");
  const sessionId = typeof form.get("session_id") === "string" ? String(form.get("session_id")) : "";
  const currentId = sessionIdFromToken((await cookies()).get(getSessionCookieName())?.value);
  const revoked = action === "revoke_others"
    ? await revokeOtherSessions(admin.id, currentId)
    : action === "revoke_one"
      ? Number(await revokeOwnedSession(admin.id, sessionId))
      : -1;
  if (revoked < 0) return new Response("Acción no válida.", { status: 400 });
  await recordAdminAudit(admin, {
    category: "access",
    action: "admin.sessions_revoke",
    entityType: "admin",
    entityId: admin.id,
    entityLabel: `@${admin.githubLogin}`,
    summary: revoked === 1 ? `${admin.githubLogin} cerró una sesión administrativa.` : `${admin.githubLogin} cerró ${revoked} sesiones administrativas.`,
    metadata: { revokedSessions: revoked },
  });
  if (sessionId && sessionId === currentId) {
    const response = NextResponse.redirect(new URL("/ingresar?closed=admin", request.url), 303);
    response.cookies.delete({ name: getSessionCookieName(), path: "/" });
    return response;
  }
  return NextResponse.redirect(new URL("/admin?session_notice=closed#sesiones", request.url), 303);
}
