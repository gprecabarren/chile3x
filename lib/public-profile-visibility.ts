import { sql } from "drizzle-orm";
import { profiles, users } from "@/db/schema";

// Account deactivation must hide its listings without changing their saved
// moderation state. A later reactivation can therefore restore them safely.
export const publicProfileCondition = sql<boolean>`${profiles.status} = 'approved' and exists (
  select 1 from ${users} where ${users.id} = ${profiles.ownerId} and ${users.isActive} = 1
)`;
