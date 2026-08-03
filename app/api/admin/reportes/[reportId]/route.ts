import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileReports } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";

const statuses = new Set(["reviewed", "resolved", "dismissed"]);
export async function POST(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  if (!await getCurrentAdmin()) return new Response("No autorizado.", { status: 401 });
  const form = await request.formData();
  const status = String(form.get("status") ?? "");
  const adminNote = String(form.get("admin_note") ?? "").trim().slice(0, 1000);
  if (!statuses.has(status)) return new Response("Estado no válido.", { status: 400 });
  const { reportId } = await params;
  await (await getDb()).update(profileReports).set({ status: status as typeof profileReports.$inferInsert.status, adminNote: adminNote || null, updatedAt: new Date().toISOString() }).where(eq(profileReports.id, reportId));
  return NextResponse.redirect(new URL(`/admin/reportes?estado=${status}&notice=updated`, request.url), 303);
}
