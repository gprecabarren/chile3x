import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sponsorGroups } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { readSponsorText } from "@/lib/sponsor-admin";
import { sponsorSortOrder, uniqueSponsorGroupSlug } from "@/lib/sponsors";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "settings.manage")) return new Response("No tienes permiso para administrar sitios asociados.", { status: 403 });
  const form = await request.formData();
  const name = readSponsorText(form, "name", 80);
  const description = readSponsorText(form, "description", 240);
  if (!name || description === null) return NextResponse.redirect(new URL("/admin/patrocinadores?error=group", request.url), 303);
  const id = `sponsor_group_${crypto.randomUUID()}`;
  const values = {
    id,
    name,
    slug: await uniqueSponsorGroupSlug(readSponsorText(form, "slug", 72) || name),
    description,
    sortOrder: sponsorSortOrder(form.get("sort_order")),
    isActive: form.get("is_active") === "on",
    updatedAt: new Date().toISOString(),
  };
  await (await getDb()).insert(sponsorGroups).values(values);
  await recordAdminAudit(admin, { category: "sponsors", action: "sponsor.group_create", summary: `Creó el grupo ${name}.`, entityType: "sponsor_group", entityId: id, entityLabel: name, after: values });
  return NextResponse.redirect(new URL("/admin/patrocinadores?notice=group-created", request.url), 303);
}
