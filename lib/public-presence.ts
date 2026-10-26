import { and, eq, gte, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { accountPresence, profiles, users } from "@/db/schema";
import { publicProfileCondition } from "./public-profile-visibility";

export const MAX_PRESENCE_PROFILES = 60;
export const ONLINE_WINDOW_MS = 3 * 60_000;
export function presenceProfileIds(values: string[]) {
  if (values.length > MAX_PRESENCE_PROFILES || values.some(id => !/^[a-zA-Z0-9_-]{1,120}$/.test(id))) return null;
  return [...new Set(values)];
}
/** Public booleans only: never return account IDs or activity timestamps. */
export async function onlinePublicProfileIds(ids: string[], now = Date.now()) {
  const bounded = presenceProfileIds(ids);
  if (!bounded) throw new Error("Consulta de presencia no válida.");
  if (!bounded.length) return [];
  const rows = await (await getDb()).select({ id: profiles.id }).from(profiles)
    .innerJoin(users, eq(users.id, profiles.ownerId))
    .innerJoin(accountPresence, eq(accountPresence.userId, users.id))
    .where(and(inArray(profiles.id, bounded), publicProfileCondition, eq(profiles.isDemo, false), isNull(users.selfDisabledAt), isNull(users.adminDisabledAt), gte(accountPresence.lastActiveAt, new Date(now - ONLINE_WINDOW_MS).toISOString())));
  return rows.map(row => row.id);
}
