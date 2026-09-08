import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileReports } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";

const statuses = new Set(["reviewed", "resolved", "dismissed"]);
export async function POST(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "reports.manage")) return new Response("No tienes permiso para administrar reportes.", { status: 403 });
  const form = await request.formData();
  const status = String(form.get("status") ?? "");
  const adminNote = String(form.get("admin_note") ?? "").trim().slice(0, 1000);
  if (!statuses.has(status)) return new Response("Estado no válido.", { status: 400 });
  const { reportId } = await params;
  const db = await getDb();
  const [existing] = await db.select({ status: profileReports.status, adminNote: profileReports.adminNote, profileId: profileReports.profileId }).from(profileReports).where(eq(profileReports.id, reportId)).limit(1);
  if (!existing) return new Response("Reporte no encontrado.", { status: 404 });
  await db.update(profileReports).set({ status: status as typeof profileReports.$inferInsert.status, adminNote: adminNote || null, updatedAt: new Date().toISOString() }).where(eq(profileReports.id, reportId));
  await recordAdminAudit(admin, { category: "reports", action: "report.update", summary: `Actualizó el reporte ${reportId} a ${status}.`, entityType: "report", entityId: reportId, entityLabel: `Reporte ${reportId}`, before: { status: existing.status, adminNote: existing.adminNote }, after: { status, adminNote: adminNote || null }, metadata: { profileId: existing.profileId } });
  return NextResponse.redirect(new URL(`/admin/reportes?estado=${status}&notice=updated`, request.url), 303);
}
