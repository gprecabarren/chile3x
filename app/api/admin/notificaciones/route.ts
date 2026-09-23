import { eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { adminNotifications } from "@/db/schema";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin, safeAdminReturnTo } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.redirect(new URL("/api/auth/github/start?return_to=/admin/actividad", request.url), 303);
  if (!adminHasCapability(admin, "audit.view")) return new Response("No tienes permiso para administrar notificaciones.", { status: 403 });
  const formData = await request.formData();
  const notificationId = typeof formData.get("notification_id") === "string" ? String(formData.get("notification_id")).slice(0, 120) : "";
  const returnTo = safeAdminReturnTo(typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : null) ?? "/admin/actividad?notice=notifications_read";
  const db = await getDb();
  const now = new Date().toISOString();
  if (formData.get("intent") === "all") await db.update(adminNotifications).set({ readAt: now }).where(isNull(adminNotifications.readAt));
  else if (notificationId) await db.update(adminNotifications).set({ readAt: now }).where(eq(adminNotifications.id, notificationId));
  else return new Response("Notificación no válida.", { status: 400 });
  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}
