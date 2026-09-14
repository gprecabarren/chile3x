import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sponsorGroups, sponsors } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { deleteSponsorImages, readSponsorText, storeSponsorImage, type StoredSponsorImage } from "@/lib/sponsor-admin";
import { safeSponsorUrl, sponsorSortOrder } from "@/lib/sponsors";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "settings.manage")) return new Response("No tienes permiso para administrar sitios asociados.", { status: 403 });
  const form = await request.formData();
  const groupId = readSponsorText(form, "group_id", 100);
  const name = readSponsorText(form, "name", 100);
  const headline = readSponsorText(form, "headline", 100);
  const subtitle = readSponsorText(form, "subtitle", 160);
  const destinationUrl = safeSponsorUrl(readSponsorText(form, "destination_url", 500) ?? "");
  const ctaLabel = readSponsorText(form, "cta_label", 40);
  const imageAlt = readSponsorText(form, "image_alt", 180);
  if (!groupId || !name || headline === null || subtitle === null || !destinationUrl || !ctaLabel || !imageAlt) return NextResponse.redirect(new URL("/admin/patrocinadores?error=card", request.url), 303);
  const db = await getDb();
  const [group] = await db.select({ id: sponsorGroups.id }).from(sponsorGroups).where(eq(sponsorGroups.id, groupId)).limit(1);
  if (!group) return NextResponse.redirect(new URL("/admin/patrocinadores?error=group-missing", request.url), 303);
  const id = `sponsor_${crypto.randomUUID()}`;
  let background: StoredSponsorImage | null = null; let logo: StoredSponsorImage | null = null;
  try {
    background = await storeSponsorImage(form.get("background"), id, "background", admin.id);
    if (!background) return NextResponse.redirect(new URL("/admin/patrocinadores?error=background", request.url), 303);
    logo = await storeSponsorImage(form.get("logo"), id, "logo", admin.id);
    const values = {
      id, groupId, name, headline, subtitle, destinationUrl, ctaLabel, imageAlt,
      displayMode: form.get("display_mode") === "image" ? "image" as const : form.get("display_mode") === "brand" ? "brand" as const : "overlay" as const,
      backgroundR2Key: background.r2Key,
      backgroundContentType: background.contentType,
      backgroundByteSize: background.byteSize,
      logoR2Key: logo?.r2Key ?? null,
      logoContentType: logo?.contentType ?? null,
      logoByteSize: logo?.byteSize ?? 0,
      sortOrder: sponsorSortOrder(form.get("sort_order")),
      isActive: form.get("is_active") === "on",
      isSponsored: form.get("is_sponsored") === "on",
      updatedAt: new Date().toISOString(),
    };
    await db.insert(sponsors).values(values);
    await recordAdminAudit(admin, { category: "sponsors", action: "sponsor.create", summary: `Creó el sitio asociado ${name}.`, entityType: "sponsor", entityId: id, entityLabel: name, after: { ...values, backgroundR2Key: "[protegido]", logoR2Key: logo ? "[protegido]" : null } });
  } catch (error) {
    await deleteSponsorImages([background?.r2Key, logo?.r2Key]);
    console.error("Unable to create sponsor", { error });
    return NextResponse.redirect(new URL("/admin/patrocinadores?error=upload", request.url), 303);
  }
  return NextResponse.redirect(new URL("/admin/patrocinadores?notice=card-created", request.url), 303);
}
