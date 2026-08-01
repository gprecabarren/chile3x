import { and, count, desc, eq, gte, inArray, or } from "drizzle-orm";
import { cityDirectory, getCityBySlug, regions } from "@/app/locations";
import { getDb } from "@/db";
import { agencyMembers, profileDetails, profileServices, profileTags, profiles, profileViews } from "@/db/schema";
import { getApprovedMediaForProfiles } from "@/lib/media";
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

export async function getPublicProfiles(options: { includeUnapproved?: boolean } = {}) {
  const db = await getDb();
  const baseQuery = db.select({ profile: profiles, details: profileDetails }).from(profiles)
    .leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id));
  const rows = options.includeUnapproved
    ? await baseQuery
    : await baseQuery.where(eq(profiles.status, "approved"));
  const ids = rows.map((row) => row.profile.id);

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

  return rows.map(({ profile, details }): PublicProfile => ({
    id: profile.id,
    slug: profile.slug,
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
export async function getFeaturedProfiles(limit = 6) {
  let publicProfiles: PublicProfile[];
  try {
    publicProfiles = (await getPublicProfiles()).filter((profile) => profile.type === "escort" && !profile.isDemo);
  } catch {
    // The static render test has no D1 binding. In production this query is
    // available, while the empty state remains accurate before launch.
    return [];
  }
  if (!publicProfiles.length) return [];

  const cutoff = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
  const viewTotals = new Map<string, number>();

  try {
    const rows = await (await getDb()).select({ profileId: profileViews.profileId, total: count() })
      .from(profileViews)
      .where(gte(profileViews.viewedOn, cutoff))
      .groupBy(profileViews.profileId)
      .orderBy(desc(count()));
    for (const row of rows) viewTotals.set(row.profileId, Number(row.total));
  } catch {
    // A transient statistics failure must not hide otherwise valid profiles.
  }

  return [...publicProfiles]
    .sort((left, right) => Number(right.isFeatured) - Number(left.isFeatured)
      || (viewTotals.get(right.id) ?? 0) - (viewTotals.get(left.id) ?? 0)
      || right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);
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
  if (profile.verificationStatus === "reviewed" && profile.type === "escort") tags.push("Comprobada");
  return tags.filter((tag): tag is string => Boolean(tag));
}

export function getFilterOptions() {
  return { skinColors, hairColors, bodyTypes, bustSizes, includedServices, additionalServices, allowedTags };
}

export function getCityInfo(citySlug: string) {
  return getCityBySlug(citySlug);
}
