import { and, asc, count, desc, eq, exists, gte, inArray, isNull, notExists, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import { chileanDay } from "@/lib/chile-day";
import { cityDirectory, getCityBySlug, regions } from "@/app/locations";
import { getDb } from "@/db";
import { accountPresence, agencyMembers, blockedProfiles, profileDetails, profileMedia, profileServices, profileTags, profiles, profileViews } from "@/db/schema";
import { getApprovedMediaForProfiles } from "@/lib/media";
import { publicProfileCondition } from "@/lib/public-profile-visibility";
import { profileMetadataForType } from "@/lib/profile-type-metadata";
import { isContentOnly, sellsContent, profileMatchesDirectoryCategory } from "@/lib/profile-content-category";
import { readDirectoryOrderSeed } from "@/lib/directory-order";
import {
  additionalServices,
  bodyTypes,
  bustSizes,
  hairColors,
  includedServices,
  profileTags as allowedTags,
  profileTypes,
  skinColors,
  tagLabels,
  tiers,
  tierLabels,
  type ProfileType,
  type Tier,
} from "@/lib/profile";

type QueryValue = string | string[] | undefined;
export type DirectoryQuery = Record<string, QueryValue>;

export type DirectoryFilters = {
  contentDirectory?: boolean;
  expanded?: boolean;
  name?: string;
  category?: "vip" | "premium" | "bronze" | "masajes" | "contenido" | "agency" | "rental";
  online: boolean;
  verified: boolean;
  region?: string;
  city?: string;
  type?: ProfileType;
  tier?: Tier;
  tags: string[];
  nationality?: string;
  gender?: string;
  skinColor?: string;
  hairColor?: string;
  bodyType?: string;
  bustSize?: string;
  language?: string;
  ageMin?: number;
  ageMax?: number;
  servicesIncluded: string[];
  servicesAdditional: string[];
  invalidCombination: boolean;
};

export type PublicProfile = {
  id: string;
  slug: string;
  handle: string | null;
  type: ProfileType;
  status: "draft" | "pending" | "approved" | "paused" | "rejected" | "expired";
  isPublic: boolean;
  displayName: string;
  shortDescription: string;
  description: string;
  region: string;
  city: string;
  comuna: string | null;
  contactWhatsapp: string | null;
  contactTelegram: string | null;
  tier: Tier;
  verificationStatus: "unreviewed" | "in_review" | "reviewed";
  revision?: number;
  verifiedAt: string | null;
  healthReviewStatus: "not_requested" | "in_review" | "reviewed";
  isFeatured: boolean;
  isDemo: boolean;
  isOnline: boolean;
  updatedAt: string;
  details: {
    contactPhone: string | null;
    contactEmail: string | null;
    referenceLocation: string | null;
    schedule: string | null;
    priceAmount: number | null;
    currency: string;
    metadata: Record<string, string>;
  };
  tags: string[];
  servicesIncluded: string[];
  servicesAdditional: string[];
  media: Array<{ id: string; url: string; altText: string | null; mediaType: "image" | "video"; contentType: string; isProfilePhoto: boolean }>;
  agencyIds: string[];
  memberIds: string[];
};

/**
 * The lightweight subset used by metadata. Keeping it separate from a full
 * public profile avoids loading services, memberships and the entire gallery
 * merely to render a page title or a social preview.
 */
export type PublicProfileSeo = Pick<PublicProfile,
  "slug" | "handle" | "type" | "displayName" | "shortDescription" | "region" | "city" | "isDemo"
> & { socialImageId: string | null; contentOnly: boolean };

function values(query: DirectoryQuery, key: string) {
  const value = query[key];
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(raw.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

function one(query: DirectoryQuery, key: string) {
  return values(query, key)[0];
}

function normalized(value: string | undefined | null) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function matchesText(value: string | undefined, expected: string | undefined) {
  return !expected || normalized(value).includes(normalized(expected));
}

function metadataValue(profile: PublicProfile, key: string) {
  return profile.details.metadata[key] ?? "";
}

function numberQuery(value: string | undefined) {
  if (!value || !/^\d{1,3}$/.test(value)) {
    return undefined;
  }
  return Number(value);
}

export function readDirectoryFilters(query: DirectoryQuery, pinned?: { region?: string; city?: string; type?: ProfileType; contentDirectory?: boolean }): DirectoryFilters {
  if (pinned?.contentDirectory) {
    const scopedQuery = { ...query, tipo: "escort", categoria: ["vip", "premium", "bronze"].includes(one(query, "categoria") ?? "") ? one(query, "categoria") : undefined, incluido: undefined, adicional: undefined };
    const filters = readDirectoryFilters(scopedQuery, { ...pinned, contentDirectory: false, type: "escort" });
    return { ...filters, contentDirectory: true, tags: filters.tags.filter(tag => tag !== "venta-contenido" && tag !== "masajes") };
  }
  const requestedTags = values(query, "tag").filter((value) => allowedTags.includes(value as (typeof allowedTags)[number]));
  const requestedCategory = one(query, "categoria");
  const category = (["vip", "premium", "bronze", "masajes", "contenido", "agency", "rental"] as const).find((value) => value === requestedCategory && (!pinned?.type || pinned.type === "escort" && value !== "agency" && value !== "rental"))
    ?? undefined;
  const nonEscortCategory = category === "agency" || category === "rental";
  const tierValue = one(query, "tier");
  const typeValue = pinned?.type ?? (category === "agency" || category === "rental" ? category : category ? "escort" : one(query, "tipo"));
  const region = pinned?.region ?? one(query, "region");
  const city = pinned?.city ?? one(query, "ciudad");
  // MILF y TRANS son categorías mutuamente excluyentes. Hombres puede
  // coexistir con cualquiera de ellas.
  const invalidCombination = requestedTags.includes("milf") && requestedTags.includes("trans");

  return {
    expanded: one(query, "filtros") === "abiertos",
    name: one(query, "nombre")?.slice(0, 80),
    category,
    online: one(query, "online") === "1",
    verified: one(query, "verificados") === "1",
    region: regions.some((item) => item.title === region) ? region : undefined,
    city: cityDirectory.some((item) => item.city === city && (!region || item.region === region)) ? city : undefined,
    type: profileTypes.includes(typeValue as ProfileType) ? typeValue as ProfileType : undefined,
    tier: category ? tiers.includes(category as Tier) ? category as Tier : undefined : tiers.includes(tierValue as Tier) ? tierValue as Tier : undefined,
    tags: nonEscortCategory || invalidCombination ? [] : requestedTags,
    nationality: nonEscortCategory ? undefined : one(query, "nacionalidad"),
    gender: nonEscortCategory ? undefined : one(query, "genero"),
    skinColor: nonEscortCategory ? undefined : one(query, "piel"),
    hairColor: nonEscortCategory ? undefined : one(query, "pelo"),
    bodyType: nonEscortCategory ? undefined : one(query, "cuerpo"),
    bustSize: nonEscortCategory ? undefined : one(query, "busto"),
    language: nonEscortCategory ? undefined : one(query, "idioma"),
    ageMin: nonEscortCategory ? undefined : numberQuery(one(query, "edad_min")),
    ageMax: nonEscortCategory ? undefined : numberQuery(one(query, "edad_max")),
    servicesIncluded: nonEscortCategory ? [] : values(query, "incluido").filter((value) => includedServices.includes(value as (typeof includedServices)[number])),
    servicesAdditional: nonEscortCategory ? [] : values(query, "adicional").filter((value) => additionalServices.includes(value as (typeof additionalServices)[number])),
    invalidCombination: nonEscortCategory ? false : invalidCombination,
  };
}

type PublicProfileOptions = {
  includeUnapproved?: boolean;
  // Only the individual profile route supplies the authenticated owner ID.
  // Never enable this on directory, search, related cards or sitemap queries.
  previewOwnerId?: string;
  includePendingMedia?: boolean;
  viewerId?: string;
  type?: ProfileType;
  city?: string;
  region?: string;
  profileIds?: string[];
  handle?: string;
  slug?: string;
  includeAssociations?: boolean;
  coverOnly?: boolean;
};

export async function getPublicProfiles(options: PublicProfileOptions = {}) {
  const db = await getDb();
  const visibility = options.includeUnapproved || options.previewOwnerId ? publicProfileCondition : sql<boolean>`1`;
  const baseQuery = db.select({ profile: profiles, details: profileDetails, isPublic: visibility }).from(profiles)
    .leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id));
  if (options.profileIds && options.profileIds.length === 0) return [] as PublicProfile[];

  const conditions = [];
  conditions.push(isNull(profiles.trashedAt));
  if (!options.includeUnapproved) conditions.push(options.previewOwnerId
    ? or(publicProfileCondition, eq(profiles.ownerId, options.previewOwnerId))
    : publicProfileCondition);
  if (options.type) conditions.push(eq(profiles.type, options.type));
  if (options.city) conditions.push(eq(profiles.city, options.city));
  if (options.region) conditions.push(eq(profiles.region, options.region));
  if (options.profileIds?.length) conditions.push(inArray(profiles.id, options.profileIds));
  if (options.handle) conditions.push(eq(profiles.handle, options.handle));
  if (options.slug) conditions.push(eq(profiles.slug, options.slug));
  if (options.viewerId) conditions.push(notExists(db.select({ id: blockedProfiles.id }).from(blockedProfiles).where(and(eq(blockedProfiles.userId, options.viewerId), eq(blockedProfiles.profileId, profiles.id)))));

  const visibleRows = conditions.length ? await baseQuery.where(and(...conditions)) : await baseQuery;
  const ids = visibleRows.map((row) => row.profile.id);

  if (!ids.length) {
    return [] as PublicProfile[];
  }

  const ownerIds = [...new Set(visibleRows.map((row) => row.profile.ownerId))];
  const previewMediaIds = visibleRows.filter(row => options.includeUnapproved && options.includePendingMedia
    || !row.isPublic && row.profile.ownerId === options.previewOwnerId).map(row => row.profile.id);
  const onlineCutoff = new Date(Date.now() - 3 * 60_000).toISOString();
  const [[tags, services, memberships, presenceRows], mediaByProfile, previewMedia] = await Promise.all([
    db.batch([
      db.select().from(profileTags).where(inArray(profileTags.profileId, ids)),
      db.select().from(profileServices).where(inArray(profileServices.profileId, ids)),
      db.select().from(agencyMembers).where(options.includeAssociations
        ? or(inArray(agencyMembers.agencyProfileId, ids), inArray(agencyMembers.memberProfileId, ids)) : sql`0`),
      db.select({ userId: accountPresence.userId }).from(accountPresence).where(and(inArray(accountPresence.userId, ownerIds), gte(accountPresence.lastActiveAt, onlineCutoff))),
    ]),
    getApprovedMediaForProfiles(ids, options.coverOnly),
    previewMediaIds.length ? db.select().from(profileMedia).where(and(
      inArray(profileMedia.profileId, previewMediaIds), eq(profileMedia.visibility, "public"),
      inArray(profileMedia.moderationStatus, ["approved", "pending"]),
    )).orderBy(asc(profileMedia.sortOrder), asc(profileMedia.createdAt)) : Promise.resolve([]),
  ]);
  // The preview can include pending uploads, but never rejected files or
  // private verification documents. The media route rechecks every request.
  if (previewMediaIds.length) {
    const { logicalProfileMedia } = await import("@/lib/owner-photo-edit");
    for (const id of previewMediaIds) mediaByProfile.set(id, await logicalProfileMedia(previewMedia.filter(media => media.profileId === id)));
  }

  const tagMap = new Map<string, string[]>();
  const includedMap = new Map<string, string[]>();
  const additionalMap = new Map<string, string[]>();
  const agencyMap = new Map<string, string[]>();
  const memberMap = new Map<string, string[]>();
  const onlineOwnerIds = new Set(presenceRows.map((row) => row.userId));
  for (const tag of tags) tagMap.set(tag.profileId, [...(tagMap.get(tag.profileId) ?? []), tag.tag]);
  for (const service of services) {
    const target = service.kind === "included" ? includedMap : additionalMap;
    target.set(service.profileId, [...(target.get(service.profileId) ?? []), service.service]);
  }
  for (const membership of memberships) {
    agencyMap.set(membership.memberProfileId, [...(agencyMap.get(membership.memberProfileId) ?? []), membership.agencyProfileId]);
    memberMap.set(membership.agencyProfileId, [...(memberMap.get(membership.agencyProfileId) ?? []), membership.memberProfileId]);
  }

  return visibleRows.map(({ profile, details, isPublic }): PublicProfile => ({
    id: profile.id,
    slug: profile.slug,
    handle: profile.handle,
    type: profile.type,
    status: profile.status,
    isPublic: Boolean(isPublic),
    displayName: profile.displayName,
    shortDescription: profile.shortDescription,
    description: profile.description,
    region: profile.region,
    city: profile.city,
    comuna: profile.comuna,
    contactWhatsapp: profile.contactWhatsapp,
    contactTelegram: profile.contactTelegram,
    tier: profile.tier,
    verificationStatus: profile.verificationStatus,
    revision: profile.revision,
    verifiedAt: profile.verifiedAt,
    healthReviewStatus: profile.healthReviewStatus,
    isFeatured: profile.isFeatured,
    isDemo: profile.isDemo,
    isOnline: onlineOwnerIds.has(profile.ownerId),
    updatedAt: profile.updatedAt,
    details: {
      contactPhone: details?.contactPhone ?? null,
      contactEmail: details?.contactEmail ?? null,
      referenceLocation: details?.referenceLocation ?? null,
      schedule: details?.schedule ?? null,
      priceAmount: details?.priceAmount ?? null,
      currency: details?.currency ?? "CLP",
      metadata: profileMetadataForType(profile.type, readMetadata(details?.metadata)),
    },
    tags: tagMap.get(profile.id) ?? [],
    servicesIncluded: profile.type === "rental" ? [] : includedMap.get(profile.id) ?? [],
    servicesAdditional: profile.type === "rental" ? [] : additionalMap.get(profile.id) ?? [],
    media: (mediaByProfile.get(profile.id) ?? []).map((media) => ({ id: media.id, url: `/media/${media.id}`, altText: media.altText, mediaType: media.mediaType, contentType: media.contentType, isProfilePhoto: media.isProfilePhoto })),
    agencyIds: agencyMap.get(profile.id) ?? [],
    memberIds: memberMap.get(profile.id) ?? [],
  }));
}

export const DIRECTORY_PAGE_SIZE = 24;

export function readDirectoryPage(query: DirectoryQuery) {
  const raw = Array.isArray(query.pagina) ? query.pagina[0] : query.pagina;
  const page = raw && /^\d{1,4}$/.test(raw) ? Number(raw) : 1;
  // Bound pathological OFFSET requests on the free D1 tier. A cursor can
  // replace page numbers if the directory grows beyond 24,000 listings.
  return Math.min(Math.max(page, 1), 1000);
}

function searchableText(column: SQL) {
  let result = sql<string>`lower(${column})`;
  for (const [from, to] of [["á", "a"], ["é", "e"], ["í", "i"], ["ó", "o"], ["ú", "u"], ["ü", "u"], ["ñ", "n"], ["Á", "a"], ["É", "e"], ["Í", "i"], ["Ó", "o"], ["Ú", "u"], ["Ü", "u"], ["Ñ", "n"]]) {
    result = sql<string>`replace(${result}, ${from}, ${to})`;
  }
  return result;
}

function containsText(column: SQL, value: string) {
  return sql<boolean>`instr(${searchableText(column)}, ${normalized(value)}) > 0`;
}

function metadataText(key: string) {
  return sql<string>`coalesce(json_extract(${profileDetails.metadata}, ${`$.${key}`}), '')`;
}

function contentOnlyCondition() {
  return sql<boolean>`(${profiles.type} = 'escort' and coalesce(json_extract(case when json_valid(${profileDetails.metadata}) then ${profileDetails.metadata} else '{}' end, '$.content_only'), '') = '1')`;
}

/** Filter IDs in D1 first, then hydrate only the 24 cards in this page. */
export async function getPublicProfilePage(filters: DirectoryFilters, options: { page?: number; viewerId?: string; preferredCity?: string; orderSeed?: number } = {}) {
  const page = Math.min(Math.max(Math.trunc(options.page ?? 1), 1), 1000);
  const orderSeed = readDirectoryOrderSeed(options.orderSeed?.toString());
  if (filters.invalidCombination) return { profiles: [] as PublicProfile[], page, pageSize: DIRECTORY_PAGE_SIZE, hasNext: false, orderSeed, outOfRange: page > 1 };

  const db = await getDb();
  const conditions: SQL[] = [publicProfileCondition];
  const contentOnly = contentOnlyCondition();
  if (options.viewerId) conditions.push(notExists(db.select({ id: blockedProfiles.id }).from(blockedProfiles).where(and(eq(blockedProfiles.userId, options.viewerId), eq(blockedProfiles.profileId, profiles.id)))));
  if (filters.region) conditions.push(eq(profiles.region, filters.region));
  if (filters.city) conditions.push(eq(profiles.city, filters.city));
  if (filters.type) conditions.push(eq(profiles.type, filters.type));
  if (filters.category === "masajes") {
    conditions.push(eq(profiles.type, "escort"));
    conditions.push(sql`not ${contentOnly}`);
    conditions.push(exists(db.select({ id: profileTags.id }).from(profileTags).where(and(eq(profileTags.profileId, profiles.id), eq(profileTags.tag, "masajes")))));
  }
  if (filters.category === "contenido" || filters.contentDirectory) {
    conditions.push(eq(profiles.type, "escort"));
    conditions.push(or(contentOnly, exists(db.select({ id: profileTags.id }).from(profileTags).where(and(eq(profileTags.profileId, profiles.id), eq(profileTags.tag, "venta-contenido")))))!);
  }
  if (filters.tier && !filters.contentDirectory) conditions.push(sql`not ${contentOnly}`);
  if (filters.tier) conditions.push(eq(profiles.tier, filters.tier));
  if (filters.verified) conditions.push(eq(profiles.verificationStatus, "reviewed"));
  if (filters.online) {
    const cutoff = new Date(Date.now() - 3 * 60_000).toISOString();
    conditions.push(exists(db.select({ id: accountPresence.userId }).from(accountPresence).where(and(eq(accountPresence.userId, profiles.ownerId), gte(accountPresence.lastActiveAt, cutoff)))));
  }
  if (filters.name) conditions.push(containsText(sql`${profiles.displayName}`, filters.name));
  for (const tag of filters.tags) conditions.push(exists(db.select({ id: profileTags.id }).from(profileTags).where(and(eq(profileTags.profileId, profiles.id), eq(profileTags.tag, tag)))));
  for (const [key, value] of [["nationality", filters.nationality], ["gender", filters.gender], ["skin_color", filters.skinColor], ["hair_color", filters.hairColor], ["body_type", filters.bodyType], ["bust_size", filters.bustSize], ["languages", filters.language]] as const) {
    if (value) conditions.push(containsText(metadataText(key), value));
  }
  if (filters.ageMin) conditions.push(sql<boolean>`cast(${metadataText("age")} as integer) >= ${filters.ageMin}`);
  if (filters.ageMax) conditions.push(sql<boolean>`cast(${metadataText("age")} as integer) <= ${filters.ageMax}`);
  for (const service of filters.servicesIncluded) conditions.push(exists(db.select({ id: profileServices.id }).from(profileServices).where(and(eq(profileServices.profileId, profiles.id), eq(profileServices.kind, "included"), eq(profileServices.service, service)))));
  for (const service of filters.servicesAdditional) conditions.push(exists(db.select({ id: profileServices.id }).from(profileServices).where(and(eq(profileServices.profileId, profiles.id), eq(profileServices.kind, "additional"), eq(profileServices.service, service)))));

  const where = and(...conditions);
  // Randomize before LIMIT, not just the loaded cards. Reuse the seed in next/
  // previous links so unchanged listings cannot overlap across adjacent pages.
  // Hash legacy non-hex IDs as well as UUIDs; arithmetic stays below 2^53.
  let suffix: SQL = sql`0`;
  for (let index = -8; index < 0; index++) suffix = sql`((${suffix} * 131 + coalesce(unicode(lower(substr(${profiles.id}, ${index}, 1))), 0)) % 2147483647)`;
  const ordering = [sql`((${suffix} * ${orderSeed}) % 2147483647)`, asc(profiles.id)];
  if (options.preferredCity && !filters.city) ordering.unshift(sql`case when ${profiles.city} = ${options.preferredCity} then 0 else 1 end`);
  const needsMetadata = Boolean(filters.contentDirectory || filters.category === "masajes" || filters.category === "contenido" || filters.tier || filters.nationality || filters.gender || filters.skinColor || filters.hairColor || filters.bodyType || filters.bustSize || filters.language || filters.ageMin || filters.ageMax);
  const idsBase = db.select({ id: profiles.id }).from(profiles);
  const ids = await (needsMetadata ? idsBase.leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id)) : idsBase)
    .where(where).orderBy(...ordering).limit(DIRECTORY_PAGE_SIZE + 1).offset((page - 1) * DIRECTORY_PAGE_SIZE);
  const hasNext = ids.length > DIRECTORY_PAGE_SIZE;
  const pageIds = ids.slice(0, DIRECTORY_PAGE_SIZE);
  const hydrated = pageIds.length ? await getPublicProfiles({ profileIds: pageIds.map((row) => row.id), viewerId: options.viewerId, coverOnly: true }) : [];
  const byId = new Map(hydrated.map((profile) => [profile.id, profile]));
  return { profiles: pageIds.flatMap((row) => { const profile = byId.get(row.id); return profile ? [profile] : []; }), page, pageSize: DIRECTORY_PAGE_SIZE, hasNext, orderSeed, outOfRange: page > 1 && !pageIds.length };
}

/** Sitemap needs only canonical paths and timestamps, never media or tags. */
export async function getPublicProfileSitemapRows() {
  return (await getDb()).select({ slug: profiles.slug, handle: profiles.handle, updatedAt: profiles.updatedAt })
    .from(profiles).where(and(publicProfileCondition, eq(profiles.isDemo, false)));
}

const getPublicProfileForRouteCached = cache(async function getPublicProfileForRouteCached(
  segment: string,
  includeUnapproved: boolean,
  viewerId?: string,
  previewOwnerId?: string,
  includePendingMedia = false,
) {
  const decoded = decodeURIComponent(segment);
  if (decoded.startsWith("@")) {
    const handle = decoded.slice(1).toLowerCase();
    const current = (await getPublicProfiles({ includeUnapproved, viewerId, previewOwnerId, includePendingMedia, includeAssociations: true, handle }))[0];
    if (current) return current;
    // The seed's old @handle equals its immutable slug. Preserve old links
    // only for known test listings; the page redirects to the current handle.
    if (handle.endsWith("-demo")) {
      const legacy = (await getPublicProfiles({ includeUnapproved, viewerId, previewOwnerId, includePendingMedia, includeAssociations: true, slug: handle }))[0];
      if (legacy?.isDemo) return legacy;
    }
    return null;
  }
  return (await getPublicProfiles({ includeUnapproved, viewerId, previewOwnerId, includePendingMedia, includeAssociations: true, slug: decoded }))[0] ?? null;
});

/**
 * Route metadata and the page body both need the same listing. Keep that
 * lookup request-scoped so a profile view never rebuilds its whole media,
 * tags and services graph twice during one render.
 */
export async function getPublicProfileForRoute(segment: string, options: Omit<PublicProfileOptions, "handle" | "slug"> = {}) {
  return getPublicProfileForRouteCached(segment, Boolean(options.includeUnapproved), options.viewerId, options.previewOwnerId, Boolean(options.includePendingMedia));
}

const getPublicProfileSeoForRouteCached = cache(async function getPublicProfileSeoForRouteCached(segment: string): Promise<PublicProfileSeo | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }

  const profileCondition = decoded.startsWith("@")
    ? or(eq(profiles.handle, decoded.slice(1).toLowerCase()), and(eq(profiles.isDemo, true), eq(profiles.slug, decoded.slice(1).toLowerCase())))
    : eq(profiles.slug, decoded);
  const [row] = await (await getDb()).select({
    slug: profiles.slug,
    handle: profiles.handle,
    type: profiles.type,
    displayName: profiles.displayName,
    shortDescription: profiles.shortDescription,
    region: profiles.region,
    city: profiles.city,
    isDemo: profiles.isDemo,
    socialImageId: profileMedia.id,
    contentOnly: contentOnlyCondition().mapWith(Boolean),
  }).from(profiles)
    .leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id))
    .leftJoin(profileMedia, and(
      eq(profileMedia.profileId, profiles.id),
      eq(profileMedia.mediaType, "image"),
      eq(profileMedia.moderationStatus, "approved"),
      eq(profileMedia.isProfilePhoto, true),
    ))
    .where(and(publicProfileCondition, profileCondition))
    .limit(1);

  return row ?? null;
});

export async function getPublicProfileSeoForRoute(segment: string) {
  return getPublicProfileSeoForRouteCached(segment);
}

function readMetadata(value: string | null | undefined): Record<string, string> {
  try {
    const parsed = JSON.parse(value ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

const tierRank: Record<Tier, number> = { vip: 0, premium: 1, bronze: 2 };

/**
 * Mantiene el privilegio de cada categoría, pero evita que un perfil quede
 * siempre primero dentro de su propio nivel. Se calcula en cada render para
 * que una recarga entregue una rotación justa sin mezclar VIP/Premium/Bronze.
 */
export function orderProfilesByTierAndRandom(profilesToOrder: PublicProfile[]) {
  const randomScores = new Map(profilesToOrder.map((profile) => [profile.id, Math.random()]));
  return [...profilesToOrder].sort((left, right) =>
    tierRank[left.tier] - tierRank[right.tier]
    || (randomScores.get(left.id)! - randomScores.get(right.id)!),
  );
}

export function filterPublicProfiles(profilesToFilter: PublicProfile[], filters: DirectoryFilters) {
  if (filters.invalidCombination) {
    return [];
  }

  const filtered = profilesToFilter.filter((profile) => {
    if (filters.region && profile.region !== filters.region) return false;
    if (filters.city && profile.city !== filters.city) return false;
    if (filters.type && profile.type !== filters.type) return false;
    if (filters.contentDirectory ? !sellsContent(profile) || (filters.tier && profile.tier !== filters.tier) : !profileMatchesDirectoryCategory(profile, filters.category)) return false;
    if (filters.tier && ((!filters.contentDirectory && isContentOnly(profile)) || profile.tier !== filters.tier)) return false;
    if (filters.online && !profile.isOnline) return false;
    if (filters.verified && profile.verificationStatus !== "reviewed") return false;
    if (!matchesText(profile.displayName, filters.name)) return false;
    if (filters.tags.some((tag) => !profile.tags.includes(tag))) return false;
    if (!matchesText(metadataValue(profile, "nationality"), filters.nationality)) return false;
    if (!matchesText(metadataValue(profile, "gender"), filters.gender)) return false;
    if (!matchesText(metadataValue(profile, "skin_color"), filters.skinColor)) return false;
    if (!matchesText(metadataValue(profile, "hair_color"), filters.hairColor)) return false;
    if (!matchesText(metadataValue(profile, "body_type"), filters.bodyType)) return false;
    if (!matchesText(metadataValue(profile, "bust_size"), filters.bustSize)) return false;
    if (!matchesText(metadataValue(profile, "languages"), filters.language)) return false;
    const age = Number(metadataValue(profile, "age"));
    if (filters.ageMin && (!Number.isFinite(age) || age < filters.ageMin)) return false;
    if (filters.ageMax && (!Number.isFinite(age) || age > filters.ageMax)) return false;
    if (filters.servicesIncluded.some((service) => !profile.servicesIncluded.includes(service))) return false;
    if (filters.servicesAdditional.some((service) => !profile.servicesAdditional.includes(service))) return false;
    return true;
  });
  return orderProfilesByTierAndRandom(filtered);
}

export async function getCityEscortCounts() {
  try {
    const db = await getDb();
    const rows = await db.select({ city: profiles.city, total: count() })
      .from(profiles)
      .leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id))
      .where(and(publicProfileCondition, eq(profiles.type, "escort"), sql`not ${contentOnlyCondition()}`))
      .groupBy(profiles.city);

    return new Map(rows.map((row) => [row.city, Number(row.total)]));
  } catch {
    // The public-home render test has no D1 binding. Production requests always
    // use D1, while this fallback keeps each city visibly at zero in that test.
    return new Map<string, number>();
  }
}

/**
 * The home page promotes real, approved escort profiles. A manual admin pick
 * is respected first, then valid unique daily views over the last 30 days.
 * This prevents a raw reload counter from deciding the public showcase.
 */
export async function getFeaturedProfiles(limit = 6, viewerId?: string) {
  const candidateLimit = Math.max(limit * 3, 18);
  const cutoff = chileanDay(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));

  try {
    const db = await getDb();
    // Do not hydrate every escort in the directory just to show six cards on
    // the home page. We first select a small, representative candidate set:
    // manually highlighted/recent listings plus the most-viewed recent ones.
    const [manualCandidates, viewedCandidates] = await Promise.all([
      db.select({ id: profiles.id }).from(profiles).leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id)).where(and(
        publicProfileCondition,
        eq(profiles.type, "escort"),
        eq(profiles.isDemo, false),
        sql`not ${contentOnlyCondition()}`,
      )).orderBy(desc(profiles.isFeatured), desc(profiles.updatedAt)).limit(candidateLimit),
      db.select({ profileId: profileViews.profileId, total: count() }).from(profileViews)
        .innerJoin(profiles, eq(profileViews.profileId, profiles.id))
        .leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id))
        .where(and(
          gte(profileViews.viewedOn, cutoff),
          publicProfileCondition,
          eq(profiles.type, "escort"),
          eq(profiles.isDemo, false),
          sql`not ${contentOnlyCondition()}`,
        ))
        .groupBy(profileViews.profileId)
        .orderBy(desc(count()))
        .limit(candidateLimit),
    ]);

    const candidateIds = [...new Set([
      ...manualCandidates.map((candidate) => candidate.id),
      ...viewedCandidates.map((candidate) => candidate.profileId),
    ])];
    if (!candidateIds.length) {
      // Durante el lanzamiento puede no existir todavía una escort real
      // aprobada. En ese único caso se conserva una portada útil con los
      // perfiles de demostración que ya son públicos en el directorio.
      const demoCandidates = await db.select({ id: profiles.id }).from(profiles).leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id)).where(and(
        publicProfileCondition,
        eq(profiles.type, "escort"),
        eq(profiles.isDemo, true),
        sql`not ${contentOnlyCondition()}`,
      )).orderBy(desc(profiles.isFeatured), desc(profiles.updatedAt)).limit(limit);
      const demoProfiles = await getPublicProfiles({ viewerId, type: "escort", profileIds: demoCandidates.map((candidate) => candidate.id), coverOnly: true });
      return [...demoProfiles]
        .sort((left, right) => Number(right.isFeatured) - Number(left.isFeatured)
          || right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, limit);
    }

    const publicProfiles = await getPublicProfiles({ viewerId, type: "escort", profileIds: candidateIds, coverOnly: true });
    const viewTotals = new Map(viewedCandidates.map((candidate) => [candidate.profileId, Number(candidate.total)]));

    return [...publicProfiles]
    .sort((left, right) => Number(right.isFeatured) - Number(left.isFeatured)
      || (viewTotals.get(right.id) ?? 0) - (viewTotals.get(left.id) ?? 0)
      || right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);
  } catch {
    // The static render test has no D1 binding. In production this query is
    // available, while the empty state remains accurate before launch.
    return [];
  }
}

function shuffleScore(value: string, seed: string) {
  let hash = 2166136261;
  for (const character of `${seed}:${value}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function shuffleProfiles(profilesToShuffle: PublicProfile[], seed = new Date().toISOString().slice(0, 10)) {
  return [...profilesToShuffle].sort((left, right) => shuffleScore(left.id, seed) - shuffleScore(right.id, seed));
}

export function prioritizeProfilesByCity(profilesToPrioritize: PublicProfile[], city?: string) {
  if (!city) return profilesToPrioritize;
  return [...profilesToPrioritize].sort((left, right) =>
    Number(right.city === city) - Number(left.city === city)
    || tierRank[left.tier] - tierRank[right.tier],
  );
}

export function getCityPath(city: string) {
  const cityData = cityDirectory.find((item) => item.city === city);
  return cityData ? `/escorts/${cityData.citySlug}` : "/escorts";
}

export function getProfileDisplayTags(profile: PublicProfile) {
  const tags = profile.type === "escort" ? [...(!isContentOnly(profile) ? [tierLabels[profile.tier]] : []), ...(sellsContent(profile) ? [tagLabels["venta-contenido"]] : []), ...profile.tags.filter(tag => tag !== "venta-contenido" && (!isContentOnly(profile) || tag !== "masajes")).map((tag) => tagLabels[tag as keyof typeof tagLabels] ?? tag)] : [];
  // Tier is the primary tag unless this is a content-only listing. A tag can have the same
  // label (for example, tier "vip" plus tag "vip"), so normalize before
  // rendering to guarantee visitors never see a duplicate badge.
  const seen = new Set<string>();
  return tags.filter((tag): tag is string => {
    if (!tag) return false;
    const key = tag.trim().toLocaleLowerCase("es-CL");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getFilterOptions() {
  return { skinColors, hairColors, bodyTypes, bustSizes, includedServices, additionalServices, allowedTags };
}

export function getCityInfo(citySlug: string) {
  return getCityBySlug(citySlug);
}
