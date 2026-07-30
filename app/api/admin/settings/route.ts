import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";

const allowedSettings = {
  listing_open: new Set(["closed", "waitlist", "open"]),
  moderation_mode: new Set(["manual", "manual_priority"]),
  billing_mode: new Set(["manual", "planned"]),
  maintenance_mode: new Set(["disabled", "enabled"]),
  robots_indexing: new Set(["enabled", "disabled"]),
};

function readText(formData: FormData, key: string, maximum: number) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.length > maximum) return null;
  return value.trim();
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });

  const formData = await request.formData();
  const updatedAt = new Date().toISOString();
  const rows: Array<{ key: string; value: string; updatedBy: string; updatedAt: string }> = [];

  for (const [key, allowed] of Object.entries(allowedSettings)) {
    const value = formData.get(key);
    if (typeof value !== "string" || !allowed.has(value)) return new Response("Configuración no válida.", { status: 400 });
    rows.push({ key, value, updatedBy: admin.id, updatedAt });
  }

  const siteTitle = readText(formData, "site_title", 90);
  const siteDescription = readText(formData, "site_description", 180);
  const siteUrl = readText(formData, "site_url", 180);
  const googleVerification = readText(formData, "google_site_verification", 180);
  const analyticsId = readText(formData, "google_analytics_id", 20);

  if (!siteTitle || !siteDescription || !siteUrl || googleVerification === null || analyticsId === null) return new Response("Configuración SEO no válida.", { status: 400 });

  try {
    if (new URL(siteUrl).protocol !== "https:") throw new Error("URL no segura");
  } catch {
    return new Response("La URL pública debe comenzar con https://", { status: 400 });
  }

  if (analyticsId && !/^G-[A-Z0-9]{6,15}$/.test(analyticsId)) return new Response("El identificador de Analytics no tiene un formato válido.", { status: 400 });

  rows.push(
    { key: "site_title", value: siteTitle, updatedBy: admin.id, updatedAt },
    { key: "site_description", value: siteDescription, updatedBy: admin.id, updatedAt },
    { key: "site_url", value: siteUrl, updatedBy: admin.id, updatedAt },
    { key: "google_site_verification", value: googleVerification, updatedBy: admin.id, updatedAt },
    { key: "google_analytics_id", value: analyticsId, updatedBy: admin.id, updatedAt },
  );

  const db = await getDb();
  for (const row of rows) {
    await db.insert(siteSettings).values(row).onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: row.value, updatedBy: admin.id, updatedAt: row.updatedAt },
    });
  }

  return NextResponse.redirect(new URL("/admin/configuracion?saved=1", request.url), 303);
}
