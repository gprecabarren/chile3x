import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload-policy";
import { MAX_PREPARED_VIDEO_BYTES } from "@/lib/video-policy";
import { exclusiveContentMedia, forumAttachments, newsMedia, profileMedia, profileReportEvidence, profileStatuses, profileVerificationFiles, profiles, sponsors, users } from "@/db/schema";

export const MAX_IMAGES_PER_PROFILE = 10;
export const MAX_IMAGE_BYTES = MAX_IMAGE_UPLOAD_BYTES;
export const MAX_VIDEOS_PER_PROFILE = 3;
export const MAX_VIDEO_BYTES = MAX_PREPARED_VIDEO_BYTES;
export const MAX_PROFILE_MEDIA_BYTES = 45_000_000;
// Keep a safety margin below Cloudflare's 10 GB monthly free allowance.
export const MEDIA_WARNING_BYTES = 7_000_000_000;
export const MEDIA_HARD_LIMIT_BYTES = 8_000_000_000;

export type SupportedImageType = "image/jpeg" | "image/png" | "image/webp";
export type SupportedVideoType = "video/mp4" | "video/webm";
export type ProfileMediaRecord = {
  id: string;
  profileId: string;
  mediaType: "image" | "video";
  r2Key: string;
  byteSize: number;
  contentType: string;
  altText: string | null;
  moderationStatus: "pending" | "approved" | "rejected";
  visibility: "public" | "exclusive";
  isProfilePhoto: boolean;
  sortOrder: number;
  createdAt: string;
};

export function formatMediaBytes(bytes: number) {
  if (bytes < 1_000_000) return `${Math.max(0, Math.round(bytes / 1_000))} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

export function getMediaQuotaState(bytes: number) {
  if (bytes >= MEDIA_HARD_LIMIT_BYTES) {
    return {
      level: "blocked" as const,
      message: "La carga está detenida para proteger la cuota gratuita de R2. Elimina o revisa archivos antes de continuar.",
    };
  }
  if (bytes >= MEDIA_WARNING_BYTES) {
    return {
      level: "warning" as const,
      message: "Atención: el almacenamiento de fotos se acerca al margen de seguridad de la cuota gratuita de R2.",
    };
  }
  return {
    level: "ok" as const,
    message: "El almacenamiento de fotos se mantiene dentro del margen gratuito configurado.",
  };
}

export function detectImageType(data: ArrayBuffer): SupportedImageType | null {
  const bytes = new Uint8Array(data);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export function extensionForImageType(contentType: SupportedImageType) {
  return contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
}

export function detectVideoType(data: ArrayBuffer): SupportedVideoType | null {
  const bytes = new Uint8Array(data);
  const marker = String.fromCharCode(...bytes.slice(0, 12));
  if (bytes.length >= 12 && marker.slice(4, 8) === "ftyp") return "video/mp4";
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "video/webm";
  return null;
}

export function extensionForVideoType(contentType: SupportedVideoType) {
  return contentType === "video/mp4" ? "mp4" : "webm";
}

export async function getProfileMedia(profileId: string) {
  return (await (await getDb()).select().from(profileMedia)
    .where(eq(profileMedia.profileId, profileId))
    .orderBy(asc(profileMedia.sortOrder), asc(profileMedia.createdAt))) as ProfileMediaRecord[];
}

export async function getMediaUsage() {
  const db = await getDb();
  // All binary uploads share the same private R2 bucket. Count every table
  // that owns an object so the quota warning stays meaningful as features
  // such as reports and stories are used.
  // One round trip, but separate statements: D1 deliberately limits compound
  // SELECTs more strictly than desktop SQLite. An eight-way UNION failed on
  // the real Worker even though ordinary SQLite tests accepted it.
  const totals=await db.batch([
    db.select({bytes:sql<number>`coalesce(sum(${forumAttachments.byteSize}),0)`,files:sql<number>`count(*)`}).from(forumAttachments),
    db.select({bytes:sql<number>`coalesce(sum(${profileMedia.byteSize}),0)`,files:sql<number>`count(*)`}).from(profileMedia).where(eq(profileMedia.visibility,"public")),
    db.select({bytes:sql<number>`coalesce(sum(${profileStatuses.byteSize}),0)`,files:sql<number>`count(*)`}).from(profileStatuses),
    db.select({bytes:sql<number>`coalesce(sum(${profileVerificationFiles.byteSize}),0)`,files:sql<number>`count(*)`}).from(profileVerificationFiles),
    db.select({bytes:sql<number>`coalesce(sum(${newsMedia.byteSize}),0)`,files:sql<number>`count(*)`}).from(newsMedia),
    db.select({bytes:sql<number>`coalesce(sum(${profileReportEvidence.byteSize}),0)`,files:sql<number>`count(*)`}).from(profileReportEvidence),
    db.select({bytes:sql<number>`coalesce(sum(${exclusiveContentMedia.byteSize}),0)`,files:sql<number>`count(*)`}).from(exclusiveContentMedia),
    db.select({bytes:sql<number>`coalesce(sum(${sponsors.backgroundByteSize}+${sponsors.logoByteSize}),0)`,files:sql<number>`count(*)+coalesce(sum(case when ${sponsors.logoR2Key} is not null then 1 else 0 end),0)`}).from(sponsors),
  ]);
  return totals.reduce((sum,[row])=>({bytes:sum.bytes+Number(row?.bytes??0),files:sum.files+Number(row?.files??0)}),{bytes:0,files:0});
}

export async function getApprovedMediaForProfiles(profileIds: string[], coverOnly = false) {
  if (!profileIds.length) return new Map<string, ProfileMediaRecord[]>();
  const rows = await (await getDb()).select().from(profileMedia)
    .where(and(
      inArray(profileMedia.profileId, profileIds),
      eq(profileMedia.moderationStatus, "approved"),
      eq(profileMedia.visibility, "public"),
      // Cards need one photo, not every full gallery and video in the page.
      // Keep the complete media set on the individual profile route.
      coverOnly ? sql`${profileMedia.id} = (SELECT cover.id FROM profile_media cover
        WHERE cover.profile_id = ${profileMedia.profileId} AND cover.media_type = 'image'
          AND cover.moderation_status = 'approved' AND cover.visibility = 'public'
        ORDER BY cover.is_profile_photo DESC, cover.sort_order ASC, cover.created_at ASC, cover.id ASC LIMIT 1)` : undefined,
    ))
    .orderBy(asc(profileMedia.sortOrder), asc(profileMedia.createdAt));
  const byProfile = new Map<string, ProfileMediaRecord[]>();
  for (const row of rows as ProfileMediaRecord[]) {
    byProfile.set(row.profileId, [...(byProfile.get(row.profileId) ?? []), row]);
  }
  return byProfile;
}

export async function getApprovedExclusiveMedia(profileId: string) {
  return (await (await getDb()).select().from(profileMedia).where(and(
    eq(profileMedia.profileId, profileId),
    eq(profileMedia.visibility, "exclusive"),
    eq(profileMedia.moderationStatus, "approved"),
  )).orderBy(asc(profileMedia.sortOrder), asc(profileMedia.createdAt))) as ProfileMediaRecord[];
}

export async function findProfileMedia(mediaId: string) {
  const [row] = await (await getDb()).select({ media: profileMedia, profile: profiles, ownerIsActive: users.isActive }).from(profileMedia)
    .innerJoin(profiles, eq(profileMedia.profileId, profiles.id))
    .innerJoin(users, eq(profiles.ownerId, users.id))
    .where(eq(profileMedia.id, mediaId))
    .limit(1);
  return row ?? null;
}
