import { count, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sponsorGroups, sponsors } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { readSponsorText } from "@/lib/sponsor-admin";
import { sponsorSortOrder, uniqueSponsorGroupSlug } from "@/lib/sponsors";

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "settings.manage")) return new Response("No tienes permiso para administrar sitios asociados.", { status: 403 });
  const { groupId } = await params; const form = await request.formData(); const db = await getDb();
  const [existing] = await db.select().from(sponsorGroups).where(eq(sponsorGroups.id, groupId)).limit(1);
  if (!existing) return new Response("Grupo no encontrado.", { status: 404 });
  if (form.get("action") === "delete") {
    if (form.get("confirm_delete") !== "on") return NextResponse.redirect(new URL("/admin/patrocinadores?error=confirm-group", request.url), 303);
    const [usage] = await db.select({ total: count() }).from(sponsors).where(eq(sponsors.groupId, groupId));
    if (Number(usage?.total ?? 0) > 0) return NextResponse.redirect(new URL("/admin/patrocinadores?error=group-not-empty", request.url), 303);
    await db.delete(sponsorGroups).where(eq(sponsorGroups.id, groupId));
    await recordAdminAudit(admin, { category: "sponsors", action: "sponsor.group_delete", summary: `Eliminó el grupo ${existing.name}.`, entityType: "sponsor_group", entityId: groupId, entityLabel: existing.name, before: existing });
    return NextResponse.redirect(new URL("/admin/patrocinadores?notice=group-deleted", request.url), 303);
  }
  const name = readSponsorText(form, "name", 80); const description = readSponsorText(form, "description", 240);
  if (!name || description === null) return NextResponse.redirect(new URL("/admin/patrocinadores?error=group", request.url), 303);
  const values = { name, slug: await uniqueSponsorGroupSlug(readSponsorText(form, "slug", 72) || name, groupId), description, sortOrder: sponsorSortOrder(form.get("sort_order")), isActive: form.get("is_active") === "on", updatedAt: new Date().toISOString() };
  await db.update(sponsorGroups).set(values).where(eq(sponsorGroups.id, groupId));
  await recordAdminAudit(admin, { category: "sponsors", action: "sponsor.group_update", summary: `Modificó el grupo ${name}.`, entityType: "sponsor_group", entityId: groupId, entityLabel: name, before: existing, after: values });
  return NextResponse.redirect(new URL("/admin/patrocinadores?notice=group-updated", request.url), 303);
}
