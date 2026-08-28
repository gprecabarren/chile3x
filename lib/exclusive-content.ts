import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  exclusiveContentAccess,
  exclusiveContentCollections,
  exclusiveContentMedia,
  profiles,
  users,
} from "@/db/schema";

export type ExclusiveContentMediaRecord = {
  id: string;
  collectionId: string;
  mediaType: "image" | "video";
  r2Key: string;
  byteSize: number;
  contentType: string;
  moderationStatus: "pending" | "approved" | "rejected";
  sortOrder: number;
  createdAt: string;
};

export type ExclusiveContentGrant = {
  userId: string;
  username: string;
  displayName: string | null;
  createdAt: string;
};

export async function getOrCreateExclusiveContentCollection(ownerId: string) {
  const db = await getDb();
  const id = `cnt_${ownerId}`;
  await db.insert(exclusiveContentCollections).values({ id, ownerId }).onConflictDoNothing();
  const [collection] = await db.select().from(exclusiveContentCollections)
    .where(eq(exclusiveContentCollections.ownerId, ownerId)).limit(1);
  if (!collection) throw new Error("No se pudo preparar el contenido exclusivo de esta cuenta.");
  return collection;
}

export async function getExclusiveContentForProfile(profileId: string, options: { viewerId?: string; isAdmin?: boolean } = {}) {
  const db = await getDb();
  const [collection] = await db.select().from(exclusiveContentCollections)
    .where(eq(exclusiveContentCollections.profileId, profileId)).limit(1);
  if (!collection) return { collection: null, media: [] as ExclusiveContentMediaRecord[], hasAccess: false };

  let hasAccess = Boolean(options.isAdmin) || collection.ownerId === options.viewerId;
  if (!hasAccess && options.viewerId) {
    const [grant] = await db.select({ id: exclusiveContentAccess.id }).from(exclusiveContentAccess).where(and(
      eq(exclusiveContentAccess.collectionId, collection.id),
      eq(exclusiveContentAccess.userId, options.viewerId),
    )).limit(1);
    hasAccess = Boolean(grant);
  }

  const mediaQuery = db.select().from(exclusiveContentMedia).where(and(
    eq(exclusiveContentMedia.collectionId, collection.id),
    eq(exclusiveContentMedia.moderationStatus, "approved"),
  )).orderBy(asc(exclusiveContentMedia.sortOrder), asc(exclusiveContentMedia.createdAt));
  // A locked visitor only needs enough opaque tiles to understand that the
  // library exists. Do not hydrate a potentially large paid gallery into the
  // public server render before their access has been checked.
  const media = hasAccess ? await mediaQuery : await mediaQuery.limit(3);
  return { collection, media: media as ExclusiveContentMediaRecord[], hasAccess };
}

export async function getSellerExclusiveContent(ownerId: string) {
  const db = await getDb();
  const collection = await getOrCreateExclusiveContentCollection(ownerId);
  const [linkedProfile] = collection.profileId ? await db.select({
    id: profiles.id,
    displayName: profiles.displayName,
    handle: profiles.handle,
    status: profiles.status,
    type: profiles.type,
  }).from(profiles).where(and(eq(profiles.id, collection.profileId), eq(profiles.ownerId, ownerId))).limit(1) : [];
  const [media, grants, escortProfiles] = await Promise.all([
    db.select().from(exclusiveContentMedia).where(eq(exclusiveContentMedia.collectionId, collection.id))
      .orderBy(asc(exclusiveContentMedia.sortOrder), asc(exclusiveContentMedia.createdAt)),
    db.select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      createdAt: exclusiveContentAccess.createdAt,
    }).from(exclusiveContentAccess).innerJoin(users, eq(exclusiveContentAccess.userId, users.id))
      .where(eq(exclusiveContentAccess.collectionId, collection.id)).orderBy(desc(exclusiveContentAccess.createdAt)),
    db.select({ id: profiles.id, displayName: profiles.displayName, handle: profiles.handle, status: profiles.status })
      .from(profiles).where(and(eq(profiles.ownerId, ownerId), eq(profiles.type, "escort"))).limit(1),
  ]);
  return {
    collection,
    linkedProfile: linkedProfile ?? null,
    escortProfiles,
    media: media as ExclusiveContentMediaRecord[],
    grants: grants.map((grant) => ({ ...grant, username: grant.username ?? "usuario" })) as ExclusiveContentGrant[],
  };
}

export async function linkExclusiveContentToEscort(ownerId: string, profileId: string | null) {
  const db = await getDb();
  const collection = await getOrCreateExclusiveContentCollection(ownerId);
  if (profileId) {
    const [profile] = await db.select({ id: profiles.id }).from(profiles).where(and(
      eq(profiles.id, profileId),
      eq(profiles.ownerId, ownerId),
      eq(profiles.type, "escort"),
    )).limit(1);
    if (!profile) throw new Error("El contenido exclusivo solo se puede vincular a un anuncio Escort propio.");
  }
  await db.update(exclusiveContentCollections).set({ profileId, updatedAt: new Date().toISOString() })
    .where(eq(exclusiveContentCollections.id, collection.id));
  return { ...collection, profileId };
}

export async function addExclusiveContentAccess(ownerId: string, identifier: string) {
  const db = await getDb();
  const collection = await getOrCreateExclusiveContentCollection(ownerId);
  const rawIdentifier = identifier.trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawIdentifier);
  const normalized = isEmail
    ? rawIdentifier.toLowerCase()
    : rawIdentifier.replace(/^@/, "").toLowerCase();
  const [target] = await db.select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(users).where(and(
      eq(users.isActive, true),
      isEmail ? eq(users.email, normalized) : eq(users.username, normalized),
    )).limit(1);
  if (!target) throw new Error("No encontramos una cuenta activa con ese correo o nombre de usuario.");
  if (target.id === ownerId) throw new Error("Tu propia cuenta ya puede ver este contenido.");
  await db.insert(exclusiveContentAccess).values({
    id: `eca_${crypto.randomUUID()}`,
    collectionId: collection.id,
    userId: target.id,
    grantedBy: ownerId,
  }).onConflictDoNothing();
  return { userId: target.id, username: target.username ?? "usuario", displayName: target.displayName, createdAt: new Date().toISOString() } satisfies ExclusiveContentGrant;
}

export async function removeExclusiveContentAccess(ownerId: string, userId: string) {
  const collection = await getOrCreateExclusiveContentCollection(ownerId);
  await (await getDb()).delete(exclusiveContentAccess).where(and(
    eq(exclusiveContentAccess.collectionId, collection.id),
    eq(exclusiveContentAccess.userId, userId),
  ));
}

export async function canAccessExclusiveContent(collectionId: string, userId?: string, isAdmin = false) {
  if (isAdmin) return true;
  if (!userId) return false;
  const db = await getDb();
  const [collection] = await db.select({ ownerId: exclusiveContentCollections.ownerId }).from(exclusiveContentCollections)
    .where(eq(exclusiveContentCollections.id, collectionId)).limit(1);
  if (!collection) return false;
  if (collection.ownerId === userId) return true;
  const [grant] = await db.select({ id: exclusiveContentAccess.id }).from(exclusiveContentAccess).where(and(
    eq(exclusiveContentAccess.collectionId, collectionId),
    eq(exclusiveContentAccess.userId, userId),
  )).limit(1);
  return Boolean(grant);
}

export async function findExclusiveContentMedia(mediaId: string) {
  const [record] = await (await getDb()).select({
    media: exclusiveContentMedia,
    collection: exclusiveContentCollections,
  }).from(exclusiveContentMedia)
    .innerJoin(exclusiveContentCollections, eq(exclusiveContentMedia.collectionId, exclusiveContentCollections.id))
    .where(eq(exclusiveContentMedia.id, mediaId)).limit(1);
  return record ?? null;
}

export async function getBuyerExclusiveContent(userId: string) {
  const db = await getDb();
  const rows = await db.select({
    collectionId: exclusiveContentCollections.id,
    sellerUsername: users.username,
    sellerName: users.displayName,
    profileName: profiles.displayName,
    profileHandle: profiles.handle,
    profileId: profiles.id,
    media: exclusiveContentMedia,
  }).from(exclusiveContentAccess)
    .innerJoin(exclusiveContentCollections, eq(exclusiveContentAccess.collectionId, exclusiveContentCollections.id))
    .innerJoin(users, eq(exclusiveContentCollections.ownerId, users.id))
    .leftJoin(profiles, eq(exclusiveContentCollections.profileId, profiles.id))
    .leftJoin(exclusiveContentMedia, and(
      eq(exclusiveContentMedia.collectionId, exclusiveContentCollections.id),
      eq(exclusiveContentMedia.moderationStatus, "approved"),
    ))
    .where(eq(exclusiveContentAccess.userId, userId))
    .orderBy(desc(exclusiveContentAccess.createdAt), asc(exclusiveContentMedia.sortOrder));

  const collections = new Map<string, {
    id: string;
    sellerUsername: string;
    sellerName: string | null;
    profileName: string | null;
    profileHandle: string | null;
    profileId: string | null;
    media: ExclusiveContentMediaRecord[];
  }>();
  for (const row of rows) {
    const existing = collections.get(row.collectionId) ?? {
      id: row.collectionId,
      sellerUsername: row.sellerUsername ?? "usuario",
      sellerName: row.sellerName,
      profileName: row.profileName,
      profileHandle: row.profileHandle,
      profileId: row.profileId,
      media: [],
    };
    if (row.media) existing.media.push(row.media as ExclusiveContentMediaRecord);
    collections.set(row.collectionId, existing);
  }
  return [...collections.values()];
}
