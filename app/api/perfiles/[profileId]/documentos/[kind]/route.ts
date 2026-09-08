import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { deleteVerificationDocument, findVerificationDocument, prepareVerificationDocument, saveVerificationDocuments, type VerificationDocumentKind, VerificationDocumentError } from "@/lib/verification-documents";
import { recordAdminAudit } from "@/lib/admin-audit";

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
  if (admin) await recordAdminAudit(admin, { category: "security", action: "private.document_view", summary: `Abrió el documento ${kind === "identity" ? "de identidad" : "médico"} del anuncio ${record.profile.displayName}.`, entityType: "verification_document", entityId: record.file.id, entityLabel: `${kind === "identity" ? "Identidad" : "Documento médico"} · ${record.profile.displayName}`, metadata: { profileId } });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", record.file.contentType);
  headers.set("content-disposition", "attachment");
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  return new Response(object.body, { headers });
}

async function getManager(profileId: string) {
  const [user, admin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
  if (admin) return { allowed: true, admin };
  if (!user) return { allowed: false, admin: null };
  const [profile] = await (await getDb()).select({ ownerId: profiles.ownerId }).from(profiles).where(eq(profiles.id, profileId)).limit(1);
  return { allowed: profile?.ownerId === user.id, admin: null };
}

export async function POST(request: Request, { params }: { params: Promise<{ profileId: string; kind: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return Response.json({ error: "Solicitud no válida." }, { status: 403 });
  }
  const { profileId, kind } = await params;
  if (kind !== "identity" && kind !== "medical") return Response.json({ error: "Tipo de documento no válido." }, { status: 400 });
  const manager = await getManager(profileId);
  if (!manager.allowed) return Response.json({ error: "No autorizado." }, { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Selecciona un archivo antes de subirlo." }, { status: 400 });
    const previous = manager.admin ? await findVerificationDocument(profileId, kind as VerificationDocumentKind) : null;
    const document = await prepareVerificationDocument(kind, file);
    await saveVerificationDocuments(profileId, [document]);
    if (manager.admin) await recordAdminAudit(manager.admin, { category: "security", action: "private.document_upload", summary: `${previous ? "Reemplazó" : "Subió"} el documento ${kind === "identity" ? "de identidad" : "médico"} del anuncio ${profileId}.`, entityType: "verification_document", entityId: previous?.file.id ?? `${profileId}:${kind}`, entityLabel: kind === "identity" ? "Documento de identidad" : "Documento médico", before: previous ? { kind, byteSize: previous.file.byteSize, contentType: previous.file.contentType } : null, after: { kind, byteSize: document.bytes.byteLength, contentType: document.contentType }, metadata: { profileId } });
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
  const manager = await getManager(profileId);
  if (!manager.allowed) return Response.json({ error: "No autorizado." }, { status: 401 });
  const existing = manager.admin ? await findVerificationDocument(profileId, kind as VerificationDocumentKind) : null;
  await deleteVerificationDocument(profileId, kind);
  if (manager.admin) await recordAdminAudit(manager.admin, { category: "security", action: "private.document_delete", summary: `Eliminó el documento ${kind === "identity" ? "de identidad" : "médico"} del anuncio ${profileId}.`, entityType: "verification_document", entityId: existing?.file.id ?? `${profileId}:${kind}`, entityLabel: kind === "identity" ? "Documento de identidad" : "Documento médico", before: existing ? { kind, byteSize: existing.file.byteSize, contentType: existing.file.contentType } : { kind }, metadata: { profileId } });
  return Response.json({ ok: true });
}
