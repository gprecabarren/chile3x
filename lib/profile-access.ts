import { and, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { collaborationGuards, profiles } from "@/db/schema";
import { guardedBatch, type ReviewVersion } from "@/lib/collaboration";

export type ProfileCapability =
  | "view"
  | "preview"
  | "edit"
  | "media"
  | "stories"
  | "documents"
  | "statistics"
  | "visibility"
  | "submit"
  | "delete";

/** One predicate for queries AND transaction guards; IDs never grant access. */
export function profileAccessCondition(
  actorId: string,
  capability: ProfileCapability = "view",
): SQL {
  const delegated =
    capability === "delete"
      ? sql`0`
      : sql`(${profiles.type}='escort' and ${profiles.agencyCustodianId} is null and exists (
    select 1 from agency_members m join profiles a on a.id=m.agency_profile_id join users au on au.id=a.owner_id
    where m.member_profile_id=${profiles.id} and m.can_manage=1 ${capability === "documents" ? sql`and m.documents_authorized=1` : sql``}
    and a.owner_id=${actorId} and a.type='agency' and a.trashed_at is null and au.is_active=1
    and not exists(select 1 from profile_details d where d.profile_id=${profiles.id} and json_valid(d.metadata) and coalesce(json_extract(d.metadata,'$.content_only'),'0')='1')
  ))`;
  return and(
    isNull(profiles.trashedAt),
    sql`exists(select 1 from users u where u.id=${profiles.ownerId} and u.is_active=1)`,
    or(
      eq(profiles.ownerId, actorId),
      delegated,
      capability === "preview"
        ? sql`exists(select 1 from agency_profile_claims c where c.escort_profile_id=${profiles.id} and c.target_user_id=${actorId} and c.status in ('pending','accepted') and c.expires_at>${Date.now()})`
        : sql`0`,
    ),
  )!;
}

export async function getProfileAccess(
  profileId: string,
  actorId: string,
  capability: ProfileCapability = "view",
) {
  const db = await getDb();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, profileId),
        profileAccessCondition(actorId, capability),
      ),
    )
    .limit(1);
  if (!profile) return null;
  const own = profile.ownerId === actorId;
  const agency = own
    ? profile.agencyCustodianId
    : (
        await db.get<{ id: string }>(
          sql`select a.id from agency_members m join profiles a on a.id=m.agency_profile_id join users u on u.id=a.owner_id where m.member_profile_id=${profileId} and m.can_manage=1 ${capability==="documents"?sql`and m.documents_authorized=1`:sql``} and a.owner_id=${actorId} and a.trashed_at is null and a.type='agency' and u.is_active=1 order by m.created_at,a.id limit 1`,
        )
      )?.id;
  return {
    profile,
    actorId,
    ownerId: profile.ownerId,
    agencyId: agency ?? null,
    isOwner: own && !profile.agencyCustodianId,
    isCustodian: own && Boolean(profile.agencyCustodianId),
  };
}
export type ProfileAccess = NonNullable<
  Awaited<ReturnType<typeof getProfileAccess>>
>;

export async function authorizedProfileBatch(
  access: ProfileAccess,
  capability: ProfileCapability,
  version: ReviewVersion,
  statements: ReadonlyArray<
    Parameters<Awaited<ReturnType<typeof getDb>>["batch"]>[0][number]
  >,
) {
  const db = await getDb(),
    id = crypto.randomUUID();
  const result = await guardedBatch(
    version,
    [
      db
        .insert(collaborationGuards)
        .values({
          id,
          allowed: sql`case when exists(select 1 from profiles where id=${access.profile.id} and ${profileAccessCondition(access.actorId, capability)}) then 1 else 0 end`,
        }),
      ...statements,
      db.delete(collaborationGuards).where(eq(collaborationGuards.id, id)),
    ],
    access.actorId,
  );
  return result.slice(1, -1);
}
