import { sql } from "drizzle-orm";
import { profiles, users } from "@/db/schema";

// Account deactivation must hide its listings without changing their saved
// moderation state. A later reactivation can therefore restore them safely.
export const publicProfileCondition = sql<boolean>`${profiles.status} = 'approved' and ${profiles.ownerHiddenAt} is null and ${profiles.trashedAt} is null and exists (
  select 1 from ${users} where ${users.id} = ${profiles.ownerId} and ${users.isActive} = 1
) and (${profiles.agencyCustodianId} is null or exists (
 select 1 from profiles agency join users au on au.id=agency.owner_id
 where agency.id=${profiles.agencyCustodianId} and agency.type='agency' and agency.status='approved'
 and agency.owner_hidden_at is null and agency.trashed_at is null and au.is_active=1
))`;
