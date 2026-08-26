import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { bugReportMessages, bugReports } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin, getCurrentUser } from "@/lib/auth";

const statuses = new Set(["new", "reviewing", "waiting_tester", "in_progress", "resolved", "closed"]);

function redirectTo(request: Request, destination: string) {
  return NextResponse.redirect(new URL(destination, request.url), 303);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ bugId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const [admin, user, { bugId }, form] = await Promise.all([getCurrentAdmin(), getCurrentUser(), params, request.formData()]);
  const db = await getDb();
  const [report] = await db.select().from(bugReports).where(eq(bugReports.id, bugId)).limit(1);
  if (!report) return new Response("Reporte no encontrado.", { status: 404 });

  const isAdmin = Boolean(admin);
  const isReporter = user?.role === "tester" && user.id === report.reporterId;
  if (!isAdmin && !isReporter) return new Response("No autorizado.", { status: 403 });
  const body = String(form.get("body") ?? "").trim().slice(0, 2000);
  const requestedStatus = String(form.get("status") ?? "");

  if (!isAdmin && body.length < 2) return redirectTo(request, "/mi-cuenta/pruebas?notice=reply_invalid");
  if (isAdmin && requestedStatus && !statuses.has(requestedStatus)) return new Response("Estado no válido.", { status: 400 });
  if (body) await db.insert(bugReportMessages).values({ id: `bugmsg_${crypto.randomUUID()}`, reportId: report.id, authorId: isAdmin ? admin!.id : user!.id, body });

  const status = isAdmin ? (requestedStatus || report.status) : report.status === "waiting_tester" ? "reviewing" : report.status;
  await db.update(bugReports).set({ status: status as typeof bugReports.$inferInsert.status, updatedAt: new Date().toISOString() }).where(and(eq(bugReports.id, report.id), eq(bugReports.reporterId, report.reporterId)));
  return redirectTo(request, isAdmin ? `/admin/bugs?estado=${status}&notice=updated` : "/mi-cuenta/pruebas?notice=updated");
}
