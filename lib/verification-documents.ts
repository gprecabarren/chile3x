import {
  authorizedProfileBatch,
  type ProfileAccess,
} from "@/lib/profile-access";
import { profileManagementActivity } from "@/lib/agency-management";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  profileVerificationFiles,
  profiles,
  dataDeletionJobs,
} from "@/db/schema";
import {
  detectImageType,
  extensionForImageType,
  type SupportedImageType,
} from "@/lib/media";
import { verificationRetentionExpiresAt } from "@/lib/data-retention-policy";

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

export async function prepareVerificationDocument(
  kind: VerificationDocumentKind,
  file: File,
): Promise<PendingVerificationDocument> {
  if (file.size > MAX_VERIFICATION_DOCUMENT_BYTES) {
    throw new VerificationDocumentError(
      "Cada documento puede pesar como máximo 15 MB.",
    );
  }
  const bytes = await file.arrayBuffer();
  const contentType = isPdf(bytes) ? "application/pdf" : detectImageType(bytes);
  if (!contentType) {
    throw new VerificationDocumentError(
      "Los documentos deben ser JPG, PNG, WebP o PDF.",
    );
  }
  return { kind, contentType, bytes };
}

export async function readVerificationDocuments(formData: FormData) {
  const entries: PendingVerificationDocument[] = [];
  const identity = fileFromForm(formData, "identity_document");
  const medical = fileFromForm(formData, "medical_certificate");
  if (identity)
    entries.push(await prepareVerificationDocument("identity", identity));
  if (medical)
    entries.push(await prepareVerificationDocument("medical", medical));
  return entries;
}

export async function saveVerificationDocuments(
  profileId: string,
  documents: PendingVerificationDocument[],
  access?: ProfileAccess,
) {
  if (!documents.length) return;
  const [{ env }, db] = await Promise.all([
    import("cloudflare:workers"),
    getDb(),
  ]);
  if (!env.MEDIA)
    throw new VerificationDocumentError(
      "El almacenamiento privado no está disponible.",
    );

  for (const document of documents) {
    const [existing] = await db
      .select()
      .from(profileVerificationFiles)
      .where(
        and(
          eq(profileVerificationFiles.profileId, profileId),
          eq(profileVerificationFiles.kind, document.kind),
        ),
      )
      .limit(1);
    const extension =
      document.contentType === "application/pdf"
        ? "pdf"
        : extensionForImageType(document.contentType);
    const key = `private-verification/${profileId}/${document.kind}-${crypto.randomUUID()}.${extension}`;
    await env.MEDIA.put(key, document.bytes, {
      httpMetadata: {
        contentType: document.contentType,
        cacheControl: "private, no-store",
        contentDisposition: "attachment",
      },
      customMetadata: {
        category: "private-verification",
        profileId,
        kind: document.kind,
      },
    });

    try {
      const mutation = db
        .insert(profileVerificationFiles)
        .values({
          id: existing?.id ?? `pvf_${crypto.randomUUID()}`,
          profileId,
          kind: document.kind,
          r2Key: key,
          byteSize: document.bytes.byteLength,
          contentType: document.contentType,
          retentionExpiresAt: verificationRetentionExpiresAt(document.kind),
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [
            profileVerificationFiles.profileId,
            profileVerificationFiles.kind,
          ],
          set: {
            r2Key: key,
            byteSize: document.bytes.byteLength,
            contentType: document.contentType,
            updatedAt: new Date().toISOString(),
            retentionExpiresAt: verificationRetentionExpiresAt(document.kind),
          },
        });
      const statusUpdate = db
        .update(profiles)
        .set(
          document.kind === "identity"
            ? { verificationStatus: "in_review", verifiedAt: null }
            : { healthReviewStatus: "in_review" },
        )
        .where(eq(profiles.id, profileId));
      const cleanup = existing?.r2Key
        ? [
            db
              .insert(dataDeletionJobs)
              .values({ id: crypto.randomUUID(), r2Key: existing.r2Key })
              .onConflictDoNothing(),
          ]
        : [];
      if (access) {
        const saved = await authorizedProfileBatch(
          access,
          "documents",
          { key: `profile:${profileId}`, revision: access.profile.revision },
          [
            mutation,
            statusUpdate,
            ...cleanup,
            profileManagementActivity(
              db,
              access,
              "document.uploaded",
              `Guardó un documento ${document.kind === "identity" ? "de identidad" : "médico"} privado para revisión.`,
            ),
            db
              .select({ revision: profiles.revision })
              .from(profiles)
              .where(eq(profiles.id, profileId)),
          ],
        );
        const last = saved.at(-1) as { revision: number }[];
        access.profile.revision = last[0].revision;
      } else await db.batch([mutation, statusUpdate, ...cleanup]);
    } catch (error) {
      await env.MEDIA.delete(key);
      throw error;
    }

    if (existing?.r2Key && existing.r2Key !== key) {
      try {
        await env.MEDIA.delete(existing.r2Key);
        await db
          .delete(dataDeletionJobs)
          .where(eq(dataDeletionJobs.r2Key, existing.r2Key));
      } catch {
        console.error("Deferred private document cleanup", { profileId });
      }
    }
  }
}

export async function deleteVerificationDocument(
  profileId: string,
  kind: VerificationDocumentKind,
  access?: ProfileAccess,
) {
  const [{ env }, db] = await Promise.all([
    import("cloudflare:workers"),
    getDb(),
  ]);
  const [existing] = await db
    .select()
    .from(profileVerificationFiles)
    .where(
      and(
        eq(profileVerificationFiles.profileId, profileId),
        eq(profileVerificationFiles.kind, kind),
      ),
    )
    .limit(1);
  if (!existing) return false;
  const mutation = db
    .delete(profileVerificationFiles)
    .where(eq(profileVerificationFiles.id, existing.id));
  const statusUpdate = db
    .update(profiles)
    .set(
      kind === "identity"
        ? { verificationStatus: "unreviewed", verifiedAt: null }
        : { healthReviewStatus: "not_requested" },
    )
    .where(eq(profiles.id, profileId));
  const cleanup = db
    .insert(dataDeletionJobs)
    .values({ id: crypto.randomUUID(), r2Key: existing.r2Key })
    .onConflictDoNothing();
  if (access) {
    const saved = await authorizedProfileBatch(
      access,
      "documents",
      { key: `profile:${profileId}`, revision: access.profile.revision },
      [
        mutation,
        statusUpdate,
        cleanup,
        profileManagementActivity(
          db,
          access,
          "document.removed",
          "Retiró un documento privado del anuncio y su verificación asociada.",
        ),
        db
          .select({ revision: profiles.revision })
          .from(profiles)
          .where(eq(profiles.id, profileId)),
      ],
    );
    const last = saved.at(-1) as { revision: number }[];
    access.profile.revision = last[0].revision;
  } else await db.batch([mutation, statusUpdate, cleanup]);
  if (env.MEDIA)
    try {
      await env.MEDIA.delete(existing.r2Key);
      await db
        .delete(dataDeletionJobs)
        .where(eq(dataDeletionJobs.r2Key, existing.r2Key));
    } catch {
      console.error("Deferred private document cleanup", { profileId });
    }
  return true;
}

export async function getVerificationDocuments(profileId: string) {
  return (await (
    await getDb()
  )
    .select({
      id: profileVerificationFiles.id,
      kind: profileVerificationFiles.kind,
      byteSize: profileVerificationFiles.byteSize,
      contentType: profileVerificationFiles.contentType,
      updatedAt: profileVerificationFiles.updatedAt,
    })
    .from(profileVerificationFiles)
    .where(
      and(
        eq(profileVerificationFiles.profileId, profileId),
        activeVerificationRetention(),
      ),
    )) as Array<{
    id: string;
    kind: VerificationDocumentKind;
    byteSize: number;
    contentType: string;
    updatedAt: string;
  }>;
}

export async function findVerificationDocument(
  profileId: string,
  kind: VerificationDocumentKind,
) {
  const [row] = await (
    await getDb()
  )
    .select({ file: profileVerificationFiles, profile: profiles })
    .from(profileVerificationFiles)
    .innerJoin(profiles, eq(profileVerificationFiles.profileId, profiles.id))
    .where(
      and(
        eq(profileVerificationFiles.profileId, profileId),
        eq(profileVerificationFiles.kind, kind),
        activeVerificationRetention(),
      ),
    )
    .limit(1);
  return row ?? null;
}

function activeVerificationRetention() {
  return sql`(${profileVerificationFiles.retentionExpiresAt} IS NULL OR datetime(${profileVerificationFiles.retentionExpiresAt}) > datetime('now')
    OR EXISTS (SELECT 1 FROM data_retention_holds WHERE entity_type='verification' AND entity_id=${profileVerificationFiles.id}))`;
}
