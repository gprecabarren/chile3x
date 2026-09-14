import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sponsorGroups, sponsors } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { deleteSponsorImages, readSponsorText, storeSponsorImage, type StoredSponsorImage } from "@/lib/sponsor-admin";
import { safeSponsorUrl, sponsorSortOrder } from "@/lib/sponsors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ sponsorId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "settings.manage")) return new Response("No tienes permiso para administrar sitios asociados.", { status: 403 });
  const { sponsorId } = await params; const form = await request.formData(); const db = await getDb();
  const [existing] = await db.select().from(sponsors).where(eq(sponsors.id, sponsorId)).limit(1);
  if (!existing) return new Response("Sitio asociado no encontrado.", { status: 404 });
  if (form.get("action") === "delete") {
    if (form.get("confirm_delete") !== "on") return NextResponse.redirect(new URL("/admin/patrocinadores?error=confirm-card", request.url), 303);
    await db.delete(sponsors).where(eq(sponsors.id, sponsorId));
    try { await deleteSponsorImages([existing.backgroundR2Key, existing.logoR2Key]); } catch (error) { console.error("Unable to delete sponsor R2 images", { sponsorId, error }); }
    await recordAdminAudit(admin, { category: "sponsors", action: "sponsor.delete", summary: `Eliminó el sitio asociado ${existing.name}.`, entityType: "sponsor", entityId: sponsorId, entityLabel: existing.name, before: { ...existing, backgroundR2Key: "[protegido]", logoR2Key: existing.logoR2Key ? "[protegido]" : null } });
    return NextResponse.redirect(new URL("/admin/patrocinadores?notice=card-deleted", request.url), 303);
  }
  const groupId = readSponsorText(form, "group_id", 100); const name = readSponsorText(form, "name", 100); const headline = readSponsorText(form, "headline", 100);
  const subtitle = readSponsorText(form, "subtitle", 160); const destinationUrl = safeSponsorUrl(readSponsorText(form, "destination_url", 500) ?? "");
  const ctaLabel = readSponsorText(form, "cta_label", 40); const imageAlt = readSponsorText(form, "image_alt", 180);
  if (!groupId || !name || headline === null || subtitle === null || !destinationUrl || !ctaLabel || !imageAlt) return NextResponse.redirect(new URL("/admin/patrocinadores?error=card", request.url), 303);
  const [group] = await db.select({ id: sponsorGroups.id }).from(sponsorGroups).where(eq(sponsorGroups.id, groupId)).limit(1);
  if (!group) return NextResponse.redirect(new URL("/admin/patrocinadores?error=group-missing", request.url), 303);
  let newBackground: StoredSponsorImage | null = null; let newLogo: StoredSponsorImage | null = null;
  const removeLogo = form.get("remove_logo") === "on";
  try {
    newBackground = await storeSponsorImage(form.get("background"), sponsorId, "background", admin.id);
    newLogo = removeLogo ? null : await storeSponsorImage(form.get("logo"), sponsorId, "logo", admin.id);
    const values = {
      groupId, name, headline, subtitle, destinationUrl, ctaLabel, imageAlt,
      displayMode: form.get("display_mode") === "image" ? "image" as const : form.get("display_mode") === "brand" ? "brand" as const : "overlay" as const,
      backgroundR2Key: newBackground?.r2Key ?? existing.backgroundR2Key,
      backgroundContentType: newBackground?.contentType ?? existing.backgroundContentType,
      backgroundByteSize: newBackground?.byteSize ?? existing.backgroundByteSize,
      logoR2Key: removeLogo ? null : newLogo?.r2Key ?? existing.logoR2Key,
      logoContentType: removeLogo ? null : newLogo?.contentType ?? existing.logoContentType,
      logoByteSize: removeLogo ? 0 : newLogo?.byteSize ?? existing.logoByteSize,
      sortOrder: sponsorSortOrder(form.get("sort_order")),
      isActive: form.get("is_active") === "on",
      isSponsored: form.get("is_sponsored") === "on",
      updatedAt: new Date().toISOString(),
    };
    await db.update(sponsors).set(values).where(eq(sponsors.id, sponsorId));
    await recordAdminAudit(admin, { category: "sponsors", action: "sponsor.update", summary: `Modificó el sitio asociado ${name}.`, entityType: "sponsor", entityId: sponsorId, entityLabel: name, before: { name: existing.name, groupId: existing.groupId, destinationUrl: existing.destinationUrl, sortOrder: existing.sortOrder, isActive: existing.isActive, isSponsored: existing.isSponsored }, after: { name, groupId, destinationUrl, sortOrder: values.sortOrder, isActive: values.isActive, isSponsored: values.isSponsored, replacedBackground: Boolean(newBackground), replacedLogo: Boolean(newLogo), removedLogo: removeLogo } });
  } catch (error) {
    await deleteSponsorImages([newBackground?.r2Key, newLogo?.r2Key]);
    console.error("Unable to update sponsor", { sponsorId, error });
    return NextResponse.redirect(new URL("/admin/patrocinadores?error=upload", request.url), 303);
  }
  try {
    await deleteSponsorImages([
      newBackground ? existing.backgroundR2Key : null,
      (removeLogo || newLogo) ? existing.logoR2Key : null,
    ]);
  } catch (error) {
    console.error("Unable to delete replaced sponsor images", { sponsorId, error });
  }
  return NextResponse.redirect(new URL("/admin/patrocinadores?notice=card-updated", request.url), 303);
}
