import { and, eq, isNull, or, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { CollaborationConflict, expectedVersion, guardedBatch, conflictResponse, mutationRedirect } from "@/lib/collaboration";
import { collaborationGuards, dataDeletionJobs, profileMedia, profiles, users } from "@/db/schema";
import { pendingPhotoReplacements } from "@/lib/owner-photo-edit";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { recordAdminAudit } from "@/lib/admin-audit";
import { bulkMediaReturnTo, MAX_BULK_MEDIA, mediaReviewVersion, parseMediaReviewSnapshot } from "@/lib/media-bulk-review";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "media.moderate")) return new Response("No tienes permiso para moderar medios.", { status: 403 });
  const { profileId } = await params;
  const form = await request.formData();
  const snapshot = parseMediaReviewSnapshot(form.get("reviewed_media"));
  if (form.get("review_confirmed") !== "yes" || !snapshot) return new Response("Confirma la revisión de los archivos mostrados.", { status: 400 });
  const destination = (notice: string) => {
    const url = new URL(bulkMediaReturnTo(form.get("return_to"), profileId), request.url);
    url.searchParams.set("media_notice", notice);
    return mutationRedirect(request, url);
  };
  const db = await getDb();
  const [profile] = await db.select({ displayName: profiles.displayName, active: users.isActive, trashedAt: profiles.trashedAt })
    .from(profiles).innerJoin(users, eq(profiles.ownerId, users.id)).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return new Response("Anuncio no encontrado.", { status: 404 });
  if (profile.trashedAt || !profile.active) return new Response("Restablece la cuenta y el anuncio antes de aprobar sus archivos.", { status: 409 });
  const scope = and(eq(profileMedia.profileId, profileId), eq(profileMedia.visibility, "public"));
  // Each logical photo may retain its approved base while an edit is pending.
  // The reviewed snapshot is still capped at 20; these extra rows are private bases.
  const files = await db.select().from(profileMedia).where(scope).limit(MAX_BULK_MEDIA * 2 + 1);
  if (files.length > MAX_BULK_MEDIA * 2) return new Response("La galería requiere revisión individual.", { status: 409 });
  const byId = new Map(files.map(file => [file.id, file]));
  const selected = [];
  for (const entry of snapshot) {
    const file = byId.get(entry.id);
    // Reject other listings, deleted/replaced images, and stale moderation state.
    if (!file || await mediaReviewVersion(file) !== entry.version) return destination("changed");
    selected.push(file);
  }
  const targets = selected.filter(file => file.moderationStatus !== "approved");
  if (!targets.length) return destination("unchanged");
  const targetIds = targets.map(file => file.id);
  const replacements = await pendingPhotoReplacements(files);
  const newest = (a: typeof files[number], b: typeof files[number]) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
  const coverTarget = targets.filter(file => file.mediaType === "image" && file.isProfilePhoto).sort(newest)[0]
    ?? files.filter(file => file.mediaType === "image" && file.isProfilePhoto && file.moderationStatus === "approved").sort(newest)[0];
  const cover = coverTarget ? replacements.get(coverTarget.id) ?? coverTarget : undefined;
  const targetPredicate = or(...targets.map(file => and(eq(profileMedia.id, file.id), eq(profileMedia.r2Key, file.r2Key))));
  // Only the reviewed IDs can become approved; a newly uploaded file remains pending.
  // D1 batch commits the cover normalization and approvals together.
  const liveProfile = sql`exists (select 1 from ${profiles} inner join ${users} on ${profiles.ownerId} = ${users.id} where ${profiles.id} = ${profileId} and ${profiles.trashedAt} is null and ${users.isActive} = 1)`;
  // Immutable R2 keys change on replacement. If even one reviewed file was
  // replaced/deleted concurrently, neither statement modifies any file.
  const unchangedFiles = sql`(select count(*) from ${profileMedia} where ${scope} and ${targetPredicate}) = ${targets.length}`;
  const guardId = crypto.randomUUID(), oldKeys: string[] = [];
  const approvals = targets.flatMap(file => {
    const base = replacements.get(file.id);
    if (!base) return [db.update(profileMedia).set({ moderationStatus: "approved" }).where(and(scope, eq(profileMedia.id, file.id)))];
    oldKeys.push(base.r2Key);
    return [
      db.update(profileMedia).set({ r2Key: file.r2Key, byteSize: file.byteSize, contentType: file.contentType, moderationStatus: "approved", isProfilePhoto: base.isProfilePhoto }).where(and(scope, eq(profileMedia.id, base.id))),
      db.insert(dataDeletionJobs).values({ id: crypto.randomUUID(), r2Key: base.r2Key }).onConflictDoNothing(),
      db.delete(profileMedia).where(and(scope, eq(profileMedia.id, file.id))),
    ];
  });
  let result;try{result = await guardedBatch(expectedVersion(form,`profile:${profileId}`),[
    db.insert(collaborationGuards).values({ id: guardId, allowed: sql`case when ${liveProfile} and ${unchangedFiles} then 1 else 0 end` }),
    ...approvals,
    db.update(profileMedia).set({ isProfilePhoto: cover ? sql`case when ${profileMedia.id} = ${cover.id} then 1 else 0 end` : false }).where(and(scope, eq(profileMedia.moderationStatus, "approved"), cover ? or(eq(profileMedia.isProfilePhoto, true), eq(profileMedia.id, cover.id)) : isNull(profileMedia.id))),
    db.delete(collaborationGuards).where(eq(collaborationGuards.id, guardId)),
  ],admin.id);}catch(error){if(error instanceof CollaborationConflict)return request.headers.get("accept")?.includes("application/json") ? conflictResponse() : destination("changed");throw error;}
  if (!result.length) return destination("changed");
  await recordAdminAudit(admin, {
    category: "media", action: "media.public_bulk_approve", entityType: "profile", entityId: profileId, entityLabel: profile.displayName,
    summary: `Aprobó ${targets.length} archivos de ${profile.displayName} en una revisión conjunta.`,
    before: { files: targets.map(file => ({ id: file.id, moderationStatus: file.moderationStatus, isProfilePhoto: file.isProfilePhoto })) },
    after: { approvedIds: targets.map(file => replacements.get(file.id)?.id ?? file.id), profilePhotoId: cover?.id ?? null }, metadata: { reviewedIds: selected.map(file => file.id), reviewedTargetIds: targetIds },
  });
  if (oldKeys.length) {
    const { env } = await import("cloudflare:workers");
    for (const key of oldKeys) try { await env.MEDIA.delete(key); await db.delete(dataDeletionJobs).where(eq(dataDeletionJobs.r2Key, key)); } catch { console.error("Bulk approval cleanup deferred"); }
  }
  return destination("approved");
}
