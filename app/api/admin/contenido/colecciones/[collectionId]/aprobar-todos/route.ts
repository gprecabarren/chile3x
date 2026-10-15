import { and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { CollaborationConflict, expectedVersion, guardedBatch, conflictResponse } from "@/lib/collaboration";
import { exclusiveContentCollections, exclusiveContentMedia, users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { recordAdminAudit } from "@/lib/admin-audit";
import { bulkMediaReturnTo, MAX_EXCLUSIVE_BULK_MEDIA, mediaReviewVersion, parseMediaReviewSnapshot } from "@/lib/media-bulk-review";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ collectionId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "media.moderate")) return new Response("No tienes permiso para moderar medios.", { status: 403 });
  const { collectionId } = await params;
  const form = await request.formData();
  const snapshot = parseMediaReviewSnapshot(form.get("reviewed_media"), MAX_EXCLUSIVE_BULK_MEDIA);
  if (form.get("review_confirmed") !== "yes" || !snapshot) return new Response("Confirma la revisión de los archivos mostrados.", { status: 400 });
  const db = await getDb();
  const [collection] = await db.select({ ownerId: users.id, ownerName: users.displayName, username: users.username, active: users.isActive })
    .from(exclusiveContentCollections).innerJoin(users, eq(users.id, exclusiveContentCollections.ownerId)).where(eq(exclusiveContentCollections.id, collectionId)).limit(1);
  if (!collection) return new Response("Biblioteca no encontrada.", { status: 404 });
  if (!collection.active) return new Response("Restablece la cuenta antes de aprobar sus archivos.", { status: 409 });
  const destination = (notice: string) => {
    const safePath = bulkMediaReturnTo(form.get("return_to"), "");
    const url = new URL(safePath.startsWith("/admin/medios") ? safePath : "/admin/medios?tipo=exclusive", request.url);
    url.searchParams.set("media_notice", notice);
    return NextResponse.redirect(url, 303);
  };
  const scope = eq(exclusiveContentMedia.collectionId, collectionId);
  const files = await db.select().from(exclusiveContentMedia).where(scope).limit(MAX_EXCLUSIVE_BULK_MEDIA + 1);
  if (files.length > MAX_EXCLUSIVE_BULK_MEDIA) return new Response("La biblioteca requiere revisión individual.", { status: 409 });
  const byId = new Map(files.map(file => [file.id, file]));
  const selected = [];
  for (const entry of snapshot) {
    const file = byId.get(entry.id);
    if (!file || await mediaReviewVersion({ ...file, isProfilePhoto: false, visibility: "exclusive" }) !== entry.version) return destination("changed");
    selected.push(file);
  }
  const targets = selected.filter(file => file.moderationStatus !== "approved");
  if (!targets.length) return destination("unchanged");
  // A single guarded update is atomic: approve only the exact reviewed versions.
  // New uploads and replacements made while this form is open remain pending.
  // Bind the bounded review list as JSON, avoiding D1's 100-parameter limit
  // for a full library of 24 files. The JSON is data, never interpolated SQL.
  const reviewedTargets = JSON.stringify(targets.map(file => ({ id: file.id, r2Key: file.r2Key, state: file.moderationStatus })));
  const targetPredicate = sql`exists (select 1 from json_each(${reviewedTargets}) as reviewed where json_extract(reviewed.value, '$.id') = ${exclusiveContentMedia.id} and json_extract(reviewed.value, '$.r2Key') = ${exclusiveContentMedia.r2Key} and json_extract(reviewed.value, '$.state') = ${exclusiveContentMedia.moderationStatus})`;
  const unchangedFiles = sql`(select count(*) from ${exclusiveContentMedia} where ${scope} and ${targetPredicate}) = ${targets.length}`;
  const liveCollection = sql`exists (select 1 from ${exclusiveContentCollections} inner join ${users} on ${users.id} = ${exclusiveContentCollections.ownerId} where ${exclusiveContentCollections.id} = ${collectionId} and ${users.isActive} = 1)`;
  try{await guardedBatch(expectedVersion(form,`library:${collectionId}`),[db.update(exclusiveContentMedia).set({moderationStatus:"approved"}).where(and(scope,targetPredicate,unchangedFiles,liveCollection))],admin.id);}catch(error){if(error instanceof CollaborationConflict)return conflictResponse();throw error;}
  await recordAdminAudit(admin, {
    category: "media", action: "media.exclusive_bulk_approve", entityType: "exclusive_collection", entityId: collectionId,
    entityLabel: collection.ownerName ?? collection.username ?? "Biblioteca privada",
    summary: `Aprobó ${targets.length} archivos exclusivos en una revisión conjunta.`,
    before: { files: targets.map(file => ({ id: file.id, moderationStatus: file.moderationStatus })) },
    after: { approvedIds: targets.map(file => file.id) }, metadata: { ownerId: collection.ownerId, reviewedIds: selected.map(file => file.id) },
  });
  return destination("exclusive_approved");
}
