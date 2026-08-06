import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profileVerificationFiles, profiles } from "@/db/schema";
import { detectImageType, extensionForImageType, type SupportedImageType } from "@/lib/media";

export type VerificationDocumentKind = "identity" | "medical";

export class VerificationDocumentError extends Error {}

export type PendingVerificationDocument = {
  kind: VerificationDocumentKind;
  contentType: SupportedImageType | "application/pdf";
  bytes: ArrayBuffer;
};

function fileFromForm(formData: FormData, field: string) {
  const value = formData.get(field);
  return value instanceof File && value.size > 0 ? value : null;
}

export const MAX_VERIFICATION_DOCUMENT_BYTES = 15_000_000;

function isPdf(bytes: ArrayBuffer) {
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  return header === "%PDF-";
}

export async function prepareVerificationDocument(kind: VerificationDocumentKind, file: File): Promise<PendingVerificationDocument> {
  if (file.size > MAX_VERIFICATION_DOCUMENT_BYTES) {
    throw new VerificationDocumentError("Cada documento puede pesar como máximo 15 MB.");
  }
  const bytes = await file.arrayBuffer();
  const contentType = isPdf(bytes) ? "application/pdf" : detectImageType(bytes);
  if (!contentType) {
    throw new VerificationDocumentError("Los documentos deben ser JPG, PNG, WebP o PDF.");
  }
  return { kind, contentType, bytes };
}

export async function readVerificationDocuments(formData: FormData) {
  const entries: PendingVerificationDocument[] = [];
  const identity = fileFromForm(formData, "identity_document");
  const medical = fileFromForm(formData, "medical_certificate");
  if (identity) entries.push(await prepareVerificationDocument("identity", identity));
  if (medical) entries.push(await prepareVerificationDocument("medical", medical));
  return entries;
}

export async function saveVerificationDocuments(profileId: string, documents: PendingVerificationDocument[]) {
  if (!documents.length) return;
  const [{ env }, db] = await Promise.all([import("cloudflare:workers"), getDb()]);
  if (!env.MEDIA) throw new VerificationDocumentError("El almacenamiento privado no está disponible.");

  for (const document of documents) {
    const [existing] = await db.select().from(profileVerificationFiles).where(and(
      eq(profileVerificationFiles.profileId, profileId),
      eq(profileVerificationFiles.kind, document.kind),
    )).limit(1);
    const extension = document.contentType === "application/pdf" ? "pdf" : extensionForImageType(document.contentType);
    const key = `private-verification/${profileId}/${document.kind}-${crypto.randomUUID()}.${extension}`;
    await env.MEDIA.put(key, document.bytes, {
      httpMetadata: { contentType: document.contentType, cacheControl: "private, no-store", contentDisposition: "attachment" },
      customMetadata: { category: "private-verification", profileId, kind: document.kind },
    });

    try {
      await db.insert(profileVerificationFiles).values({
        id: existing?.id ?? `pvf_${crypto.randomUUID()}`,
        profileId,
        kind: document.kind,
        r2Key: key,
        byteSize: document.bytes.byteLength,
        contentType: document.contentType,
        updatedAt: new Date().toISOString(),
      }).onConflictDoUpdate({
        target: [profileVerificationFiles.profileId, profileVerificationFiles.kind],
        set: { r2Key: key, byteSize: document.bytes.byteLength, contentType: document.contentType, updatedAt: new Date().toISOString() },
      });
    } catch (error) {
      await env.MEDIA.delete(key);
      throw error;
    }

    if (existing?.r2Key && existing.r2Key !== key) {
      await env.MEDIA.delete(existing.r2Key);
    }
  }
}

export async function deleteVerificationDocument(profileId: string, kind: VerificationDocumentKind) {
  const [{ env }, db] = await Promise.all([import("cloudflare:workers"), getDb()]);
  const [existing] = await db.select().from(profileVerificationFiles).where(and(
    eq(profileVerificationFiles.profileId, profileId),
    eq(profileVerificationFiles.kind, kind),
  )).limit(1);
  if (!existing) return false;
  await db.delete(profileVerificationFiles).where(eq(profileVerificationFiles.id, existing.id));
  if (env.MEDIA) await env.MEDIA.delete(existing.r2Key);
  return true;
}

export async function getVerificationDocuments(profileId: string) {
  return (await (await getDb()).select({
    id: profileVerificationFiles.id,
    kind: profileVerificationFiles.kind,
    byteSize: profileVerificationFiles.byteSize,
    contentType: profileVerificationFiles.contentType,
    updatedAt: profileVerificationFiles.updatedAt,
  }).from(profileVerificationFiles).where(eq(profileVerificationFiles.profileId, profileId))) as Array<{
    id: string;
    kind: VerificationDocumentKind;
    byteSize: number;
    contentType: string;
    updatedAt: string;
  }>;
}

export async function findVerificationDocument(profileId: string, kind: VerificationDocumentKind) {
  const [row] = await (await getDb()).select({ file: profileVerificationFiles, profile: profiles }).from(profileVerificationFiles)
    .innerJoin(profiles, eq(profileVerificationFiles.profileId, profiles.id))
    .where(and(eq(profileVerificationFiles.profileId, profileId), eq(profileVerificationFiles.kind, kind)))
    .limit(1);
  return row ?? null;
}
