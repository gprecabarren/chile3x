import { and, eq, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileReportEvidence, profileReports, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import {
  detectImageType,
  extensionForImageType,
  getMediaUsage,
  MEDIA_HARD_LIMIT_BYTES,
} from "@/lib/media";
import { MAX_REPORT_EVIDENCE_BYTES, MAX_REPORT_EVIDENCE_IMAGES, MAX_REPORT_EVIDENCE_TOTAL_BYTES } from "@/lib/report-evidence";
import { TURNSTILE_PROFILE_REPORT_ACTION } from "@/lib/turnstile";
import { verifyTurnstile } from "@/lib/turnstile-server";

const reasons = new Set(["impersonation", "inappropriate", "fraud", "underage", "wrong_information", "other"]);
function error(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }

  // Reports are attributable. This prevents anonymous abuse and lets the
  // reporting person follow up from their account without exposing evidence.
  const user = await getCurrentUser();
  if (!user) return error("Inicia sesión para reportar un anuncio.", 401);

  const { profileId } = await params;
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, ownerId: profiles.ownerId }).from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.status, "approved"))).limit(1);
  if (!profile) return error("El anuncio ya no está disponible.", 404);
  if (profile.ownerId === user.id) return error("No puedes reportar tu propio anuncio.", 403);

  const form = await request.formData();
  const reason = String(form.get("reason") ?? "");
  const body = String(form.get("body") ?? "").trim().replace(/\s+/g, " ");
  if (!reasons.has(reason) || body.length < 10 || body.length > 1000) return error("Selecciona un motivo y escribe entre 10 y 1.000 caracteres.", 400);
  if (!await verifyTurnstile(request, form.get("cf-turnstile-response"), TURNSTILE_PROFILE_REPORT_ACTION)) return error("La verificación antispam no fue válida.", 403);

  const evidenceEntries = form.getAll("evidence");
  if (evidenceEntries.length > MAX_REPORT_EVIDENCE_IMAGES) return error("Puedes adjuntar como máximo 10 pantallazos.", 400);
  if (evidenceEntries.some((entry) => typeof entry === "string")) return error("Los adjuntos deben ser imágenes válidas.", 400);
  const evidenceFiles = evidenceEntries.filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (evidenceFiles.length !== evidenceEntries.length) return error("Cada pantallazo debe ser un archivo de imagen válido.", 400);
  if (evidenceFiles.some((file) => file.size > MAX_REPORT_EVIDENCE_BYTES)) return error("Cada pantallazo debe pesar menos de 5 MB.", 400);
  const totalEvidenceBytes = evidenceFiles.reduce((total, file) => total + file.size, 0);
  if (totalEvidenceBytes > MAX_REPORT_EVIDENCE_TOTAL_BYTES) return error("El total de las evidencias no puede superar 25 MB.", 400);

  const evidenceResult = await Promise.all(evidenceFiles.map(async (file) => {
    const data = await file.arrayBuffer();
    const contentType = detectImageType(data);
    if (!contentType) throw new Error("Solo se permiten pantallazos JPEG, PNG o WebP válidos.");
    return { data, contentType };
  })).then((evidence) => ({ evidence })).catch((cause) => ({ error: cause instanceof Error ? cause.message : "No se pudieron leer las evidencias." }));
  if ("error" in evidenceResult) return error(evidenceResult.error, 400);
  const evidence = evidenceResult.evidence;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await db.select({ id: profileReports.id }).from(profileReports).where(and(eq(profileReports.profileId, profileId), eq(profileReports.reporterId, user.id), gte(profileReports.createdAt, since))).limit(1);
  if (recent.length) return error("Ya enviaste un reporte para este anuncio durante las últimas 24 horas.", 429);

  const usage = await getMediaUsage();
  if (usage.bytes + totalEvidenceBytes > MEDIA_HARD_LIMIT_BYTES) return error("No podemos recibir evidencias ahora para proteger el almacenamiento del sitio. Intenta más tarde.", 503);

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return error("El almacenamiento privado no está disponible.", 503);

  const reportId = `report_${crypto.randomUUID()}`;
  const uploadedKeys: string[] = [];
  try {
    await db.insert(profileReports).values({ id: reportId, profileId, reporterId: user.id, reason: reason as typeof profileReports.$inferInsert.reason, body });
    for (const item of evidence) {
      const id = `report_evidence_${crypto.randomUUID()}`;
      const r2Key = `report-evidence/${reportId}/${id}.${extensionForImageType(item.contentType)}`;
      await env.MEDIA.put(r2Key, item.data, {
        httpMetadata: { contentType: item.contentType, contentDisposition: "inline", cacheControl: "private, no-store" },
        customMetadata: { reportId, reporterId: user.id, purpose: "report-evidence" },
        storageClass: "Standard",
      });
      uploadedKeys.push(r2Key);
      await db.insert(profileReportEvidence).values({ id, reportId, r2Key, byteSize: item.data.byteLength, contentType: item.contentType });
    }
  } catch (cause) {
    if (uploadedKeys.length) await env.MEDIA.delete(uploadedKeys);
    await db.delete(profileReports).where(eq(profileReports.id, reportId));
    throw cause;
  }

  return NextResponse.json({
    message: "Recibimos tu reporte. El equipo de Chile3X lo revisará de forma privada.",
    reportId,
    evidenceCount: evidence.length,
  }, { status: 201 });
}
