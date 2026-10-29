import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { collaborationGuards, profileMedia, profiles } from "@/db/schema";
import { CollaborationConflict, guardedBatch, type ReviewVersion } from "@/lib/collaboration";
import { getProfileMedia } from "@/lib/media";
import { logicalProfileMedia } from "@/lib/owner-photo-edit";
import { validGalleryOrder } from "@/lib/media-order";

export class MediaOrderError extends Error { readonly status = 400; }

export async function reorderProfileMedia(profileId: string, kind: unknown, order: unknown, version: ReviewVersion, actorId?: string) {
  if (version.key !== `profile:${profileId}`) throw new CollaborationConflict();
  const files = await logicalProfileMedia(await getProfileMedia(profileId));
  if (!validGalleryOrder(files, kind, order)) throw new MediaOrderError("El orden no coincide con los archivos actuales. Recarga la galería.");
  const db = await getDb(), guard = crypto.randomUUID();
  const updates = order.flatMap((id, sortOrder) => {
    const file = files.find(file => file.id === id)!;
    return [id, ...(file.replacementOf ? [file.replacementOf] : [])].map(mediaId => db.update(profileMedia).set({ sortOrder }).where(and(eq(profileMedia.id, mediaId), eq(profileMedia.profileId, profileId))));
  });
  const result = await guardedBatch(version, [
    db.insert(collaborationGuards).values({ id: guard, allowed: sql`case when exists(select 1 from profiles p join users u on u.id=p.owner_id where p.id=${profileId} and p.trashed_at is null and u.is_active=1 and u.role!='admin') then 1 else 0 end` }),
    ...updates,
    db.delete(collaborationGuards).where(eq(collaborationGuards.id, guard)),
    db.select({ revision: profiles.revision }).from(profiles).where(eq(profiles.id, profileId)),
  ], actorId);
  const saved = result.at(-1);
  if (!Array.isArray(saved) || !Number.isSafeInteger(saved[0]?.revision)) throw new Error("No se pudo confirmar el orden guardado.");
  return { ok: true, kind, order, revision: saved[0].revision as number };
}
