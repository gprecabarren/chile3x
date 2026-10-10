import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { profileContactEvents } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";

/** Server-only, guarded even if another caller forgets the page's session check. */
export async function getAdminWhatsappStatistics(profileId: string) {
  if (!await getCurrentAdmin()) return null;
  const [row] = await (await getDb()).select({ clicks: sql<number>`coalesce(sum(${profileContactEvents.clickCount}), 0)`, dailyBrowsers: count() })
    .from(profileContactEvents).where(and(eq(profileContactEvents.profileId, profileId), eq(profileContactEvents.kind, "whatsapp")));
  return { clicks: Number(row?.clicks ?? 0), dailyBrowsers: Number(row?.dailyBrowsers ?? 0) };
}
