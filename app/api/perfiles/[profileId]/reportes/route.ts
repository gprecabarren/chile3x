import { and, eq, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileReports, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { TURNSTILE_PROFILE_REPORT_ACTION } from "@/lib/turnstile";
import { verifyTurnstile } from "@/lib/turnstile-server";

const reasons = new Set(["impersonation", "inappropriate", "fraud", "underage", "wrong_information", "other"]);
function error(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const form = await request.formData();
  const reason = String(form.get("reason") ?? "");
  const body = String(form.get("body") ?? "").trim().replace(/\s+/g, " ");
  if (!reasons.has(reason) || body.length < 10 || body.length > 1000) return error("Selecciona un motivo y escribe entre 10 y 1.000 caracteres.", 400);
  if (!await verifyTurnstile(request, form.get("cf-turnstile-response"), TURNSTILE_PROFILE_REPORT_ACTION)) return error("La verificación antispam no fue válida.", 403);
  const { profileId } = await params;
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.status, "approved"))).limit(1);
  if (!profile) return error("El anuncio ya no está disponible.", 404);
  const user = await getCurrentUser();
  if (user) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await db.select({ id: profileReports.id }).from(profileReports).where(and(eq(profileReports.profileId, profileId), eq(profileReports.reporterId, user.id), gte(profileReports.createdAt, since))).limit(1);
    if (recent.length) return error("Ya enviaste un reporte para este anuncio durante las últimas 24 horas.", 429);
  }
  await db.insert(profileReports).values({ id: `report_${crypto.randomUUID()}`, profileId, reporterId: user?.id ?? null, reason: reason as typeof profileReports.$inferInsert.reason, body });
  return NextResponse.json({ message: "Recibimos tu reporte. El equipo de Chile3X lo revisará de forma privada." }, { status: 201 });
}
