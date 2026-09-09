import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { validateFaqEntries } from "@/lib/faq";
import { validatePublicationRules } from "@/lib/publication-rules";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";

const allowedSettings = {
  listing_open: new Set(["closed", "waitlist", "open"]),
  moderation_mode: new Set(["manual", "manual_priority"]),
  billing_mode: new Set(["manual", "planned"]),
  maintenance_mode: new Set(["disabled", "enabled"]),
  robots_indexing: new Set(["enabled", "disabled"]),
  profile_gallery_watermark_enabled: new Set(["enabled", "disabled"]),
  profile_gallery_face_blur_enabled: new Set(["enabled", "disabled"]),
};

function readText(formData: FormData, key: string, maximum: number) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.length > maximum) return null;
  return value.trim();
}

function configurationReturnTo(formData: FormData) {
  const value = readText(formData, "return_to", 120);
  return value && /^\/admin\/configuracion(?:\/[a-z-]+)?$/.test(value) ? value : "/admin/configuracion";
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "settings.manage")) return new Response("No tienes permiso para cambiar la configuración.", { status: 403 });

  const formData = await request.formData();
  const updatedAt = new Date().toISOString();
  const rows: Array<{ key: string; value: string; updatedBy: string; updatedAt: string }> = [];
  const set = (key: string, value: string) => rows.push({ key, value, updatedBy: admin.id, updatedAt });

  for (const [key, allowed] of Object.entries(allowedSettings)) {
    if (!formData.has(key)) continue;
    const value = formData.get(key);
    if (typeof value !== "string" || !allowed.has(value)) return new Response("Configuración no válida.", { status: 400 });
    set(key, value);
  }

  const siteTitle = formData.has("site_title") ? readText(formData, "site_title", 90) : undefined;
  const siteDescription = formData.has("site_description") ? readText(formData, "site_description", 180) : undefined;
  const siteUrl = formData.has("site_url") ? readText(formData, "site_url", 180) : undefined;
  if (siteTitle !== undefined) {
    if (!siteTitle) return new Response("El título global es obligatorio.", { status: 400 });
    set("site_title", siteTitle);
  }
  if (siteDescription !== undefined) {
    if (!siteDescription) return new Response("La descripción global es obligatoria.", { status: 400 });
    set("site_description", siteDescription);
  }
  if (siteUrl !== undefined) {
    try {
      if (!siteUrl || new URL(siteUrl).protocol !== "https:") throw new Error("URL no segura");
    } catch {
      return new Response("La URL pública debe comenzar con https://", { status: 400 });
    }
    set("site_url", siteUrl);
  }

  const optionalText = [
    ["google_site_verification", 180], ["google_analytics_id", 20], ["google_oauth_client_id", 180], ["contact_whatsapp", 22],
    ["contact_telegram", 180], ["contact_instagram", 180], ["contact_email", 180],
  ] as const;
  const values: Record<string, string> = {};
  for (const [key, maximum] of optionalText) {
    if (!formData.has(key)) continue;
    const value = readText(formData, key, maximum);
    if (value === null) return new Response("Configuración no válida.", { status: 400 });
    values[key] = value;
    set(key, value);
  }

  if (values.google_analytics_id && !/^G-[A-Z0-9]{6,15}$/.test(values.google_analytics_id)) return new Response("El identificador de Analytics no tiene un formato válido.", { status: 400 });
  if (values.google_oauth_client_id && !/^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(values.google_oauth_client_id)) return new Response("El ID del cliente de Google no tiene un formato válido.", { status: 400 });
  if (values.contact_whatsapp && !/^\+?[\d\s()-]{8,22}$/.test(values.contact_whatsapp)) return new Response("El WhatsApp de contacto no tiene un formato válido.", { status: 400 });
  if (values.contact_telegram && !(/^@?[A-Za-z0-9_]{5,32}$/.test(values.contact_telegram) || /^https:\/\/(t\.me|www\.t\.me)\/[A-Za-z0-9_]{5,32}\/?$/i.test(values.contact_telegram))) return new Response("Telegram debe ser un usuario o enlace t.me válido.", { status: 400 });
  if (values.contact_instagram && !(/^@?[A-Za-z0-9._]{1,30}$/.test(values.contact_instagram) || /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/i.test(values.contact_instagram))) return new Response("Instagram debe ser un usuario o enlace de Instagram válido.", { status: 400 });
  if (values.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contact_email)) return new Response("El correo de contacto no tiene un formato válido.", { status: 400 });

  if (formData.has("faq_entries")) {
    const entries = readText(formData, "faq_entries", 14000);
    const validatedEntries = entries && validateFaqEntries(entries);
    if (!validatedEntries) return new Response("Las preguntas frecuentes no tienen un formato válido.", { status: 400 });
    set("faq_entries", JSON.stringify(validatedEntries));
  }
  if (formData.has("publication_rules")) {
    const rules = readText(formData, "publication_rules", 32000);
    const validatedRules = rules && validatePublicationRules(rules);
    if (!validatedRules) return new Response("Las reglas de publicación no tienen un formato válido.", { status: 400 });
    set("publication_rules", JSON.stringify(validatedRules));
    set("publication_rules_updated_at", updatedAt);
  }
  if (!rows.length) return new Response("No se recibieron cambios.", { status: 400 });

  const db = await getDb();
  const previousRows = await db.select({ key: siteSettings.key, value: siteSettings.value })
    .from(siteSettings)
    .where(inArray(siteSettings.key, rows.map((row) => row.key)));
  const before = Object.fromEntries(previousRows.map((row) => [row.key, row.value]));
  for (const row of rows) {
    await db.insert(siteSettings).values(row).onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: row.value, updatedBy: admin.id, updatedAt: row.updatedAt },
    });
  }
  await recordAdminAudit(admin, { category: "settings", action: "settings.update", summary: `Modificó ${rows.length} ${rows.length === 1 ? "ajuste" : "ajustes"} del sitio.`, entityType: "settings", entityId: configurationReturnTo(formData), entityLabel: "Configuración del sitio", before, after: Object.fromEntries(rows.map((row) => [row.key, row.value])), metadata: { changedKeys: rows.map((row) => row.key) } });

  const url = new URL(configurationReturnTo(formData), request.url);
  url.searchParams.set("saved", "1");
  return NextResponse.redirect(url, 303);
}
