import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { profileReportEvidence, profileReports } from "@/db/schema";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";

// Report evidence is never public. It can only be read by its reporter or an
// authenticated Chile3X administrator through this authorization gate.
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ reportId: string; evidenceId: string }> }) {
  const { reportId, evidenceId } = await params;
  const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
  const [record] = await (await getDb()).select({ evidence: profileReportEvidence, reporterId: profileReports.reporterId })
    .from(profileReportEvidence)
    .innerJoin(profileReports, eq(profileReportEvidence.reportId, profileReports.id))
    .where(and(eq(profileReportEvidence.id, evidenceId), eq(profileReportEvidence.reportId, reportId)))
    .limit(1);
  if (!record || (!admin && record.reporterId !== user?.id)) notFound();

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return new Response("El almacenamiento no está disponible.", { status: 503 });
  const object = await env.MEDIA.get(record.evidence.r2Key);
  if (!object) notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", record.evidence.contentType);
  headers.set("content-disposition", "inline");
  headers.set("x-content-type-options", "nosniff");
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");
  return new Response(object.body, { headers });
}
