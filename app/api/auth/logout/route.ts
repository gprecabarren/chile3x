import { NextRequest, NextResponse } from "next/server";
import {
  assertSameOrigin,
  deleteBrowserSessions,
  clearSessionCookies,
  getCurrentAdmin,
} from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (admin) {
    await recordAdminAudit(admin, {
      category: "access",
      action: "admin.logout",
      entityType: "admin",
      entityId: admin.id,
      entityLabel: admin.displayName ?? admin.email,
      summary: `${admin.displayName ?? admin.email} cerró su sesión administrativa.`,
    });
  }
  await deleteBrowserSessions(request);
  const response = NextResponse.redirect(new URL("/ingresar?closed=admin", request.url), 303);
  clearSessionCookies(response);
  return response;
}
