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

  // Account switching is an explicit same-origin POST, never a logout side
  // effect of visiting the public denial page or a cross-site OAuth link.
  let retryGithub = false;
  if (/application\/x-www-form-urlencoded|multipart\/form-data/i.test(request.headers.get("content-type") ?? "")) {
    try { retryGithub = (await request.formData()).get("intent") === "github_retry"; }
    catch { return new Response("Solicitud no válida.", { status: 400 }); }
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
  // Keep the POST redirect on-site: CSP form-action 'self' also checks redirect
  // chains. A fresh document starts the provider navigation after cleanup.
  const response = NextResponse.redirect(new URL(retryGithub ? "/admin/acceso-denegado?reason=github_retry" : "/ingresar?closed=admin", request.url), 303);
  response.headers.set("cache-control", "no-store");
  clearSessionCookies(response);
  return response;
}
