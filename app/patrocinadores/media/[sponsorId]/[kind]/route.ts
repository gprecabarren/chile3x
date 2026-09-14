import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { sponsorGroups, sponsors } from "@/db/schema";
import { adminHasCapability } from "@/lib/admin-permissions";
import { getCurrentAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ sponsorId: string; kind: string }> }) {
  const { sponsorId, kind } = await params;
  if (kind !== "background" && kind !== "logo") notFound();
  const [row] = await (await getDb()).select({ card: sponsors, groupActive: sponsorGroups.isActive })
    .from(sponsors).innerJoin(sponsorGroups, eq(sponsors.groupId, sponsorGroups.id))
    .where(and(eq(sponsors.id, sponsorId))).limit(1);
  if (!row) notFound();
  const settings = await getSiteSettings();
  const publiclyVisible = settings.sponsors_enabled === "enabled" && row.card.isActive && row.groupActive;
  if (!publiclyVisible) {
    const admin = await getCurrentAdmin();
    if (!adminHasCapability(admin, "settings.manage")) notFound();
  }
  const r2Key = kind === "background" ? row.card.backgroundR2Key : row.card.logoR2Key;
  const contentType = kind === "background" ? row.card.backgroundContentType : row.card.logoContentType;
  if (!r2Key || !contentType) notFound();
  const { env } = await import("cloudflare:workers");
  const object = await env.MEDIA?.get(r2Key);
  if (!object) notFound();
  const headers = new Headers(); object.writeHttpMetadata(headers);
  headers.set("content-type", contentType);
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", publiclyVisible ? "public, max-age=86400, stale-while-revalidate=604800" : "private, no-store");
  return new Response(object.body, { headers });
}
