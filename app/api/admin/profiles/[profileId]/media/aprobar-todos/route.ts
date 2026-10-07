import { and, eq, isNull, or, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileMedia, profiles, users } from "@/db/schema";
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
    return NextResponse.redirect(url, 303);
  };
  const db = await getDb();
  const [profile] = await db.select({ displayName: profiles.displayName, active: users.isActive, trashedAt: profiles.trashedAt })
    .from(profiles).innerJoin(users, eq(profiles.ownerId, users.id)).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return new Response("Anuncio no encontrado.", { status: 404 });
  if (profile.trashedAt || !profile.active) return new Response("Restablece la cuenta y el anuncio antes de aprobar sus archivos.", { status: 409 });
  const scope = and(eq(profileMedia.profileId, profileId), eq(profileMedia.visibility, "public"));
  const files = await db.select().from(profileMedia).where(scope).limit(MAX_BULK_MEDIA + 1);
  if (files.length > MAX_BULK_MEDIA) return new Response("La galería requiere revisión individual.", { status: 409 });
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
  const newest = (a: typeof files[number], b: typeof files[number]) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
  const cover = targets.filter(file => file.mediaType === "image" && file.isProfilePhoto).sort(newest)[0]
    ?? files.filter(file => file.mediaType === "image" && file.isProfilePhoto && file.moderationStatus === "approved").sort(newest)[0];
  const targetPredicate = or(...targets.map(file => and(eq(profileMedia.id, file.id), eq(profileMedia.r2Key, file.r2Key))));
  // Only the reviewed IDs can become approved; a newly uploaded file remains pending.
  // D1 batch commits the cover normalization and approvals together.
  const liveProfile = sql`exists (select 1 from ${profiles} inner join ${users} on ${profiles.ownerId} = ${users.id} where ${profiles.id} = ${profileId} and ${profiles.trashedAt} is null and ${users.isActive} = 1)`;
  // Immutable R2 keys change on replacement. If even one reviewed file was
  // replaced/deleted concurrently, neither statement modifies any file.
  const unchangedFiles = sql`(select count(*) from ${profileMedia} where ${scope} and ${targetPredicate}) = ${targets.length}`;
  const result = await db.batch([
    db.update(profileMedia).set({ moderationStatus: "approved" }).where(and(scope, targetPredicate, liveProfile, unchangedFiles)),
    db.update(profileMedia).set({ isProfilePhoto: cover ? sql`case when ${profileMedia.id} = ${cover.id} then 1 else 0 end` : false }).where(and(scope, eq(profileMedia.moderationStatus, "approved"), cover ? or(eq(profileMedia.isProfilePhoto, true), eq(profileMedia.id, cover.id)) : isNull(profileMedia.id), liveProfile, unchangedFiles)),
  ]);
  if (result[0].meta.changes !== targets.length) return destination("changed");
  await recordAdminAudit(admin, {
    category: "media", action: "media.public_bulk_approve", entityType: "profile", entityId: profileId, entityLabel: profile.displayName,
    summary: `Aprobó ${targets.length} archivos de ${profile.displayName} en una revisión conjunta.`,
    before: { files: targets.map(file => ({ id: file.id, moderationStatus: file.moderationStatus, isProfilePhoto: file.isProfilePhoto })) },
    after: { approvedIds: targetIds, profilePhotoId: cover?.id ?? null }, metadata: { reviewedIds: selected.map(file => file.id) },
  });
  return destination("approved");
}
