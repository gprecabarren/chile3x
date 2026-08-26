import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { authSessions, users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin, safeAdminReturnTo } from "@/lib/auth";
import { sendPortalEmail } from "@/lib/account-email";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";

function redirectWithNotice(request: Request, notice: string, returnTo = "/admin/cuentas") {
  const url = new URL(returnTo, request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });

  const [{ userId }, formData] = await Promise.all([params, request.formData()]);
  const returnTo = safeAdminReturnTo(typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : null);
  const nextState = formData.get("next_state");
  if ((nextState !== "active" && nextState !== "disabled") || userId === admin.id) return redirectWithNotice(request, "status_error", returnTo);

  const db = await getDb();
  const [target] = await db.select({
    id: users.id,
    role: users.role,
    isActive: users.isActive,
    email: users.email,
    displayName: users.displayName,
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target || target.role === "admin") return redirectWithNotice(request, "status_error", returnTo);

  const isActive = nextState === "active";
  await db.update(users).set({ isActive }).where(and(eq(users.id, userId), eq(users.role, target.role)));
  if (!isActive) {
    await db.delete(authSessions).where(eq(authSessions.userId, userId));
    if (target.isActive) {
      const settings = await getSiteSettings();
      const contactUrl = new URL("/contacto", siteBaseUrl(settings.site_url)).toString();
      const delivered = await sendPortalEmail({
        email: target.email,
        displayName: target.displayName,
        subject: "Tu cuenta fue deshabilitada | Chile3X",
        heading: "Tu cuenta fue deshabilitada",
        message: "El acceso a tu cuenta fue deshabilitado por la administración. Tus anuncios dejaron de estar disponibles mientras revisamos esta medida.",
        action: { label: "Contactar a Chile3X", href: contactUrl },
        note: "Si crees que se trata de un error o necesitas aclarar algo, contáctanos desde el enlace anterior.",
      });
      if (!delivered) console.error("Could not send account disabled email", { userId });
    }
  }

  return redirectWithNotice(request, "status_updated", returnTo);
}
