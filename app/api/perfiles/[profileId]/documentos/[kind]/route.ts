import { getProfileAccess } from "@/lib/profile-access";
import { CollaborationConflict,expectedVersion } from "@/lib/collaboration";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { deleteVerificationDocument, findVerificationDocument, prepareVerificationDocument, saveVerificationDocuments, type VerificationDocumentKind, VerificationDocumentError } from "@/lib/verification-documents";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ profileId: string; kind: string }> }) {
  const { profileId, kind } = await params;
  if (kind !== "identity" && kind !== "medical") notFound();
  const record = await findVerificationDocument(profileId, kind as VerificationDocumentKind);
  if (!record) notFound();

  const [user, sessionAdmin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
  const admin = adminHasCapability(sessionAdmin, "private.view") ? sessionAdmin : null;
  if (!admin && (!user || !await getProfileAccess(profileId,user.id,"documents"))) notFound();

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
  const [user, sessionAdmin] = await Promise.all([getCurrentUser(), getCurrentAdmin()]);
  const admin = adminHasCapability(sessionAdmin, "private.view") ? sessionAdmin : null;
  if (admin) return { allowed: true, admin,access:null };
  if (!user) return { allowed: false, admin: null,access:null };
  const access=await getProfileAccess(profileId,user.id,"documents");
  return { allowed:Boolean(access),admin:null,access };
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
    if (formData.get("document_authorization") !== "on") {
      const adminCustody = manager.admin
        ? (await (await getDb()).select({ id: profiles.agencyCustodianId }).from(profiles).where(eq(profiles.id, profileId)).limit(1))[0]?.id
        : null;
      if (manager.access?.isCustodian || adminCustody) {
        return Response.json({ error: "Confirma la autorización específica para aportar documentos privados de esta persona." }, { status: 400 });
      }
    }
    if(manager.access&&formData.has("review_revision"))manager.access.profile.revision=expectedVersion(formData,`profile:${profileId}`).revision;
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Selecciona un archivo antes de subirlo." }, { status: 400 });
    const previous = manager.admin ? await findVerificationDocument(profileId, kind as VerificationDocumentKind) : null;
    const document = await prepareVerificationDocument(kind, file);
    await saveVerificationDocuments(profileId, [document],manager.access??undefined);
    if (manager.admin) await recordAdminAudit(manager.admin, { category: "security", action: "private.document_upload", summary: `${previous ? "Reemplazó" : "Subió"} el documento ${kind === "identity" ? "de identidad" : "médico"} del anuncio ${profileId}.`, entityType: "verification_document", entityId: previous?.file.id ?? `${profileId}:${kind}`, entityLabel: kind === "identity" ? "Documento de identidad" : "Documento médico", before: previous ? { kind, byteSize: previous.file.byteSize, contentType: previous.file.contentType } : null, after: { kind, byteSize: document.bytes.byteLength, contentType: document.contentType }, metadata: { profileId } });
    const revision=manager.access?.profile.revision??(await (await getDb()).select({revision:profiles.revision}).from(profiles).where(eq(profiles.id,profileId)).limit(1))[0]?.revision;
    return Response.json({ ok: true, revision, document: { kind, byteSize: document.bytes.byteLength, contentType: document.contentType } });
  } catch (error) {
    if(error instanceof CollaborationConflict)return Response.json({error:error.message},{status:409});
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
  if(manager.access&&request.headers.has("x-profile-revision")){const value=request.headers.get("x-profile-revision")!;if(!/^\d{1,12}$/.test(value))return Response.json({error:"La revisión no es válida."},{status:400});manager.access.profile.revision=Number(value);}
  const existing = manager.admin ? await findVerificationDocument(profileId, kind as VerificationDocumentKind) : null;
  try{await deleteVerificationDocument(profileId, kind,manager.access??undefined);}catch(cause){if(cause instanceof CollaborationConflict)return Response.json({error:cause.message},{status:409});throw cause;}
  if (manager.admin) await recordAdminAudit(manager.admin, { category: "security", action: "private.document_delete", summary: `Eliminó el documento ${kind === "identity" ? "de identidad" : "médico"} del anuncio ${profileId}.`, entityType: "verification_document", entityId: existing?.file.id ?? `${profileId}:${kind}`, entityLabel: kind === "identity" ? "Documento de identidad" : "Documento médico", before: existing ? { kind, byteSize: existing.file.byteSize, contentType: existing.file.contentType } : { kind }, metadata: { profileId } });
  const revision=manager.access?.profile.revision??(await (await getDb()).select({revision:profiles.revision}).from(profiles).where(eq(profiles.id,profileId)).limit(1))[0]?.revision;
  return Response.json({ ok: true, revision });
}
