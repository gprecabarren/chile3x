import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "settings.manage")) return new Response("No tienes permiso para administrar sitios asociados.", { status: 403 });
  const form = await request.formData();
  const value = form.get("sponsors_enabled") === "enabled" ? "enabled" : "disabled";
  const db = await getDb();
  const [previous] = await db.select({ value: siteSettings.value }).from(siteSettings).where((await import("drizzle-orm")).eq(siteSettings.key, "sponsors_enabled")).limit(1);
  const updatedAt = new Date().toISOString();
  await db.insert(siteSettings).values({ key: "sponsors_enabled", value, updatedBy: admin.id, updatedAt }).onConflictDoUpdate({
    target: siteSettings.key,
    set: { value, updatedBy: admin.id, updatedAt },
  });
  await recordAdminAudit(admin, {
    category: "sponsors",
    action: "sponsor.visibility_update",
    summary: `${value === "enabled" ? "Publicó" : "Ocultó"} la página de Sitios asociados.`,
    entityType: "settings",
    entityId: "sponsors_enabled",
    entityLabel: "Visibilidad de Sitios asociados",
    before: { value: previous?.value ?? "enabled" },
    after: { value },
  });
  return NextResponse.redirect(new URL(`/admin/patrocinadores?notice=${value}`, request.url), 303);
}
