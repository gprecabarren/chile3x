import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";

const allowedSettings = {
  listing_open: new Set(["closed", "waitlist", "open"]),
  moderation_mode: new Set(["manual", "manual_priority"]),
  billing_mode: new Set(["manual", "planned"]),
};

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    return new Response("No autorizado.", { status: 401 });
  }

  const formData = await request.formData();
  const rows: Array<{ key: string; value: string; updatedBy: string; updatedAt: string }> = [];

  for (const [key, allowed] of Object.entries(allowedSettings)) {
    const value = formData.get(key);

    if (typeof value !== "string" || !allowed.has(value)) {
      return new Response("Configuración no válida.", { status: 400 });
    }

    rows.push({ key, value, updatedBy: admin.id, updatedAt: new Date().toISOString() });
  }

  const db = await getDb();

  for (const row of rows) {
    await db.insert(siteSettings).values(row).onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: row.value, updatedBy: admin.id, updatedAt: row.updatedAt },
    });
  }

  return NextResponse.redirect(new URL("/admin/configuracion?saved=1", request.url), 303);
}
