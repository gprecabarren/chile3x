import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { deleteVerificationDocument, findVerificationDocument, prepareVerificationDocument, saveVerificationDocuments, type VerificationDocumentKind, VerificationDocumentError } from "@/lib/verification-documents";

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

async function canManage(profileId: string) {
  const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
  if (admin) return true;
  if (!user) return false;
  const [profile] = await (await getDb()).select({ ownerId: profiles.ownerId }).from(profiles).where(eq(profiles.id, profileId)).limit(1);
  return profile?.ownerId === user.id;
}

export async function POST(request: Request, { params }: { params: Promise<{ profileId: string; kind: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  const { profileId, kind } = await params;
  if (kind !== "identity" && kind !== "medical") return Response.json({ error: "Tipo de documento no válido." }, { status: 400 });
  if (!await canManage(profileId)) return Response.json({ error: "No autorizado." }, { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Selecciona un archivo antes de subirlo." }, { status: 400 });
    const document = await prepareVerificationDocument(kind, file);
    await saveVerificationDocuments(profileId, [document]);
    return Response.json({ ok: true, document: { kind, byteSize: document.bytes.byteLength, contentType: document.contentType } });
  } catch (error) {
    const message = error instanceof VerificationDocumentError ? error.message : "No se pudo subir el documento. Inténtalo nuevamente.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ profileId: string; kind: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  const { profileId, kind } = await params;
  if (kind !== "identity" && kind !== "medical") return Response.json({ error: "Tipo de documento no válido." }, { status: 400 });
  if (!await canManage(profileId)) return Response.json({ error: "No autorizado." }, { status: 401 });
  await deleteVerificationDocument(profileId, kind);
  return Response.json({ ok: true });
}
