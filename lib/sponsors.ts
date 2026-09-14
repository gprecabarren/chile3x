import { and, asc, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { sponsorGroups, sponsors } from "@/db/schema";

export type SponsorGroupRecord = typeof sponsorGroups.$inferSelect;
export type SponsorRecord = typeof sponsors.$inferSelect;
export type SponsorGroupWithCards = SponsorGroupRecord & { sponsors: SponsorRecord[] };

export function sponsorSlug(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
}

export function safeSponsorUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || value.length > 500) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sponsorSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(typeof value === "string" ? value : "0", 10);
  return Number.isFinite(parsed) ? Math.max(-9_999, Math.min(9_999, parsed)) : 0;
}

async function loadSponsorGroups(includeInactive: boolean): Promise<SponsorGroupWithCards[]> {
  const db = await getDb();
  const groups = await db.select().from(sponsorGroups)
    .where(includeInactive ? undefined : eq(sponsorGroups.isActive, true))
    .orderBy(asc(sponsorGroups.sortOrder), asc(sponsorGroups.name));
  if (!groups.length) return [];
  const cards = await db.select().from(sponsors)
    .where(and(
      inArray(sponsors.groupId, groups.map((group) => group.id)),
      includeInactive ? undefined : eq(sponsors.isActive, true),
    ))
    .orderBy(asc(sponsors.sortOrder), asc(sponsors.name));
  return groups.map((group) => ({
    ...group,
    sponsors: cards.filter((card) => card.groupId === group.id),
  }));
}

export const listPublicSponsorGroups = cache(async () => (
  (await loadSponsorGroups(false)).filter((group) => group.sponsors.length > 0)
));

export async function listAdminSponsorGroups() {
  return loadSponsorGroups(true);
}

export async function findSponsor(sponsorId: string) {
  const [card] = await (await getDb()).select().from(sponsors).where(eq(sponsors.id, sponsorId)).limit(1);
  return card ?? null;
}

export async function uniqueSponsorGroupSlug(value: string, excludedId?: string) {
  const db = await getDb();
  const root = sponsorSlug(value) || "grupo";
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix ? `${root.slice(0, 66)}-${suffix + 1}` : root;
    const [existing] = await db.select({ id: sponsorGroups.id }).from(sponsorGroups)
      .where(eq(sponsorGroups.slug, candidate)).limit(1);
    if (!existing || existing.id === excludedId) return candidate;
  }
  return `${root.slice(0, 55)}-${crypto.randomUUID().slice(0, 8)}`;
}
