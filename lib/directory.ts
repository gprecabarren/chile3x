import { and, count, desc, eq, gte, inArray, or } from "drizzle-orm";
import { cache } from "react";
import { cityDirectory, getCityBySlug, regions } from "@/app/locations";
import { getDb } from "@/db";
import { agencyMembers, profileDetails, profileServices, profileTags, profiles, profileViews } from "@/db/schema";
import { getApprovedMediaForProfiles } from "@/lib/media";
import { getBlockedProfileIds } from "@/lib/profile-safety";
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
  type ProfileType,
  type Tier,
} from "@/lib/profile";

type QueryValue = string | string[] | undefined;
export type DirectoryQuery = Record<string, QueryValue>;

export type DirectoryFilters = {
  name?: string;
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
  healthReviewStatus: "not_requested" | "in_review" | "reviewed";
  isFeatured: boolean;
  isDemo: boolean;
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

export function readDirectoryFilters(query: DirectoryQuery, pinned?: { region?: string; city?: string; type?: ProfileType }): DirectoryFilters {
  const requestedTags = values(query, "tag").filter((value) => allowedTags.includes(value as (typeof allowedTags)[number]));
  const tierValue = one(query, "tier");
  const typeValue = pinned?.type ?? one(query, "tipo");
  const region = pinned?.region ?? one(query, "region");
  const city = pinned?.city ?? one(query, "ciudad");
  // MILF y TRANS son categorías mutuamente excluyentes. Hombres puede
  // coexistir con cualquiera de ellas.
  const invalidCombination = requestedTags.includes("milf") && requestedTags.includes("trans");

  return {
    name: one(query, "nombre")?.slice(0, 80),
    region: regions.some((item) => item.title === region) ? region : undefined,
    city: cityDirectory.some((item) => item.city === city && (!region || item.region === region)) ? city : undefined,
    type: profileTypes.includes(typeValue as ProfileType) ? typeValue as ProfileType : undefined,
    tier: tiers.includes(tierValue as Tier) ? tierValue as Tier : undefined,
    tags: invalidCombination ? [] : requestedTags,
    nationality: one(query, "nacionalidad"),
    gender: one(query, "genero"),
    skinColor: one(query, "piel"),
    hairColor: one(query, "pelo"),
    bodyType: one(query, "cuerpo"),
    bustSize: one(query, "busto"),
    language: one(query, "idioma"),
    ageMin: numberQuery(one(query, "edad_min")),
    ageMax: numberQuery(one(query, "edad_max")),
    servicesIncluded: values(query, "incluido").filter((value) => includedServices.includes(value as (typeof includedServices)[number])),
    servicesAdditional: values(query, "adicional").filter((value) => additionalServices.includes(value as (typeof additionalServices)[number])),
    invalidCombination,
  };
}

type PublicProfileOptions = {
  includeUnapproved?: boolean;
  viewerId?: string;
  type?: ProfileType;
  city?: string;
  region?: string;
  profileIds?: string[];
  handle?: string;
  slug?: string;
};

export async function getPublicProfiles(options: PublicProfileOptions = {}) {
  const db = await getDb();
  const baseQuery = db.select({ profile: profiles, details: profileDetails }).from(profiles)
    .leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id));
  if (options.profileIds && options.profileIds.length === 0) return [] as PublicProfile[];

  const conditions = [];
  if (!options.includeUnapproved) conditions.push(eq(profiles.status, "approved"));
  if (options.type) conditions.push(eq(profiles.type, options.type));
  if (options.city) conditions.push(eq(profiles.city, options.city));
  if (options.region) conditions.push(eq(profiles.region, options.region));
  if (options.profileIds?.length) conditions.push(inArray(profiles.id, options.profileIds));
  if (options.handle) conditions.push(eq(profiles.handle, options.handle));
  if (options.slug) conditions.push(eq(profiles.slug, options.slug));

  const rows = conditions.length ? await baseQuery.where(and(...conditions)) : await baseQuery;
  const blockedIds = await getBlockedProfileIds(options.viewerId);
  const visibleRows = rows.filter((row) => !blockedIds.has(row.profile.id));
  const ids = visibleRows.map((row) => row.profile.id);

  if (!ids.length) {
    return [] as PublicProfile[];
  }

  const [tags, services, memberships, mediaByProfile] = await Promise.all([
    db.select().from(profileTags).where(inArray(profileTags.profileId, ids)),
    db.select().from(profileServices).where(inArray(profileServices.profileId, ids)),
    db.select().from(agencyMembers).where(or(inArray(agencyMembers.agencyProfileId, ids), inArray(agencyMembers.memberProfileId, ids))),
    getApprovedMediaForProfiles(ids),
  ]);

  const tagMap = new Map<string, string[]>();
  const includedMap = new Map<string, string[]>();
  const additionalMap = new Map<string, string[]>();
  const agencyMap = new Map<string, string[]>();
  const memberMap = new Map<string, string[]>();
  for (const tag of tags) tagMap.set(tag.profileId, [...(tagMap.get(tag.profileId) ?? []), tag.tag]);
  for (const service of services) {
    const target = service.kind === "included" ? includedMap : additionalMap;
    target.set(service.profileId, [...(target.get(service.profileId) ?? []), service.service]);
  }
  for (const membership of memberships) {
    agencyMap.set(membership.memberProfileId, [...(agencyMap.get(membership.memberProfileId) ?? []), membership.agencyProfileId]);
    memberMap.set(membership.agencyProfileId, [...(memberMap.get(membership.agencyProfileId) ?? []), membership.memberProfileId]);
  }

  return visibleRows.map(({ profile, details }): PublicProfile => ({
    id: profile.id,
    slug: profile.slug,
    handle: profile.handle,
    type: profile.type,
    status: profile.status,
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
    healthReviewStatus: profile.healthReviewStatus,
    isFeatured: profile.isFeatured,
    isDemo: profile.isDemo,
    updatedAt: profile.updatedAt,
    details: {
      contactPhone: details?.contactPhone ?? null,
      contactEmail: details?.contactEmail ?? null,
      referenceLocation: details?.referenceLocation ?? null,
      schedule: details?.schedule ?? null,
      priceAmount: details?.priceAmount ?? null,
      currency: details?.currency ?? "CLP",
      metadata: readMetadata(details?.metadata),
    },
    tags: tagMap.get(profile.id) ?? [],
    servicesIncluded: includedMap.get(profile.id) ?? [],
    servicesAdditional: additionalMap.get(profile.id) ?? [],
    media: (mediaByProfile.get(profile.id) ?? []).map((media) => ({ id: media.id, url: `/media/${media.id}`, altText: media.altText, mediaType: media.mediaType, contentType: media.contentType, isProfilePhoto: media.isProfilePhoto })),
    agencyIds: agencyMap.get(profile.id) ?? [],
    memberIds: memberMap.get(profile.id) ?? [],
  }));
}

const getPublicProfileForRouteCached = cache(async function getPublicProfileForRouteCached(
  segment: string,
  includeUnapproved: boolean,
  viewerId?: string,
) {
  const decoded = decodeURIComponent(segment);
  if (decoded.startsWith("@")) {
    return (await getPublicProfiles({ includeUnapproved, viewerId, handle: decoded.slice(1).toLowerCase() }))[0] ?? null;
  }
  return (await getPublicProfiles({ includeUnapproved, viewerId, slug: decoded }))[0] ?? null;
});

/**
 * Route metadata and the page body both need the same listing. Keep that
 * lookup request-scoped so a profile view never rebuilds its whole media,
 * tags and services graph twice during one render.
 */
export async function getPublicProfileForRoute(segment: string, options: Omit<PublicProfileOptions, "handle" | "slug"> = {}) {
  return getPublicProfileForRouteCached(segment, Boolean(options.includeUnapproved), options.viewerId);
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

const tierRank: Record<Tier, number> = { vip: 0, premium: 1, gold: 2 };

/**
 * Mantiene el privilegio de cada categoría, pero evita que un perfil quede
 * siempre primero dentro de su propio nivel. Se calcula en cada render para
 * que una recarga entregue una rotación justa sin mezclar VIP/Premium/Gold.
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
    if (filters.tier && profile.tier !== filters.tier) return false;
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
      .where(and(eq(profiles.status, "approved"), eq(profiles.type, "escort")))
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
  const cutoff = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

  try {
    const db = await getDb();
    // Do not hydrate every escort in the directory just to show six cards on
    // the home page. We first select a small, representative candidate set:
    // manually highlighted/recent listings plus the most-viewed recent ones.
    const [manualCandidates, viewedCandidates] = await Promise.all([
      db.select({ id: profiles.id }).from(profiles).where(and(
        eq(profiles.status, "approved"),
        eq(profiles.type, "escort"),
        eq(profiles.isDemo, false),
      )).orderBy(desc(profiles.isFeatured), desc(profiles.updatedAt)).limit(candidateLimit),
      db.select({ profileId: profileViews.profileId, total: count() }).from(profileViews)
        .innerJoin(profiles, eq(profileViews.profileId, profiles.id))
        .where(and(
          gte(profileViews.viewedOn, cutoff),
          eq(profiles.status, "approved"),
          eq(profiles.type, "escort"),
          eq(profiles.isDemo, false),
        ))
        .groupBy(profileViews.profileId)
        .orderBy(desc(count()))
        .limit(candidateLimit),
    ]);

    const candidateIds = [...new Set([
      ...manualCandidates.map((candidate) => candidate.id),
      ...viewedCandidates.map((candidate) => candidate.profileId),
    ])];
    if (!candidateIds.length) return [];

    const publicProfiles = await getPublicProfiles({ viewerId, type: "escort", profileIds: candidateIds });
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
    tierRank[left.tier] - tierRank[right.tier]
    || Number(right.city === city) - Number(left.city === city),
  );
}

export function getCityPath(city: string) {
  const cityData = cityDirectory.find((item) => item.city === city);
  return cityData ? `/escorts/${cityData.citySlug}` : "/escorts";
}

export function getProfileDisplayTags(profile: PublicProfile) {
  const tags = profile.type === "escort" ? [profile.tier.toUpperCase(), ...profile.tags.map((tag) => tagLabels[tag as keyof typeof tagLabels] ?? tag)] : [];
  // Tier is always the primary tag. A manually assigned tag can have the same
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
