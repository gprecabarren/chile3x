import { notFound } from "next/navigation";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { findVerificationDocument, type VerificationDocumentKind } from "@/lib/verification-documents";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ profileId: string; kind: string }> }) {
  const { profileId, kind } = await params;
  if (kind !== "identity" && kind !== "medical") notFound();
  const record = await findVerificationDocument(profileId, kind as VerificationDocumentKind);
  if (!record) notFound();

  const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
  if (user?.id !== record.profile.ownerId && !admin) notFound();

  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) return new Response("El almacenamiento privado no está disponible.", { status: 503 });
  const object = await env.MEDIA.get(record.file.r2Key);
  if (!object) notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", record.file.contentType);
  headers.set("content-disposition", "attachment");
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  return new Response(object.body, { headers });
}
