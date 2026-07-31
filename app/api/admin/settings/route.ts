import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { validateFaqEntries } from "@/lib/faq";
import { validatePublicationRules } from "@/lib/publication-rules";

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
  const whatsapp = readText(formData, "contact_whatsapp", 22);
  const telegram = readText(formData, "contact_telegram", 180);
  const instagram = readText(formData, "contact_instagram", 180);
  const contactEmail = readText(formData, "contact_email", 180);
  const faqEntries = readText(formData, "faq_entries", 14000);
  const publicationRules = readText(formData, "publication_rules", 32000);

  if (!siteTitle || !siteDescription || !siteUrl || googleVerification === null || analyticsId === null || whatsapp === null || telegram === null || contactEmail === null || faqEntries === null || publicationRules === null) return new Response("Configuración SEO no válida.", { status: 400 });
  const validatedFaqEntries = validateFaqEntries(faqEntries);
  if (!validatedFaqEntries) return new Response("Las preguntas frecuentes no tienen un formato válido.", { status: 400 });
  const validatedPublicationRules = validatePublicationRules(publicationRules);
  if (!validatedPublicationRules) return new Response("Las reglas de publicación no tienen un formato válido.", { status: 400 });

  try {
    if (new URL(siteUrl).protocol !== "https:") throw new Error("URL no segura");
  } catch {
    return new Response("La URL pública debe comenzar con https://", { status: 400 });
  }

  if (analyticsId && !/^G-[A-Z0-9]{6,15}$/.test(analyticsId)) return new Response("El identificador de Analytics no tiene un formato válido.", { status: 400 });
  if (whatsapp && !/^\+?[\d\s()-]{8,22}$/.test(whatsapp)) return new Response("El WhatsApp de contacto no tiene un formato válido.", { status: 400 });
  if (telegram && !(/^@?[A-Za-z0-9_]{5,32}$/.test(telegram) || /^https:\/\/(t\.me|www\.t\.me)\/[A-Za-z0-9_]{5,32}\/?$/i.test(telegram))) return new Response("Telegram debe ser un usuario o enlace t.me válido.", { status: 400 });
  if (instagram && !(/^@?[A-Za-z0-9._]{1,30}$/.test(instagram) || /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/i.test(instagram))) return new Response("Instagram debe ser un usuario o enlace de Instagram válido.", { status: 400 });
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) return new Response("El correo de contacto no tiene un formato válido.", { status: 400 });

  rows.push(
    { key: "site_title", value: siteTitle, updatedBy: admin.id, updatedAt },
    { key: "site_description", value: siteDescription, updatedBy: admin.id, updatedAt },
    { key: "site_url", value: siteUrl, updatedBy: admin.id, updatedAt },
    { key: "google_site_verification", value: googleVerification, updatedBy: admin.id, updatedAt },
    { key: "google_analytics_id", value: analyticsId, updatedBy: admin.id, updatedAt },
    { key: "contact_whatsapp", value: whatsapp, updatedBy: admin.id, updatedAt },
    { key: "contact_telegram", value: telegram, updatedBy: admin.id, updatedAt },
    { key: "contact_instagram", value: instagram, updatedBy: admin.id, updatedAt },
    { key: "contact_email", value: contactEmail, updatedBy: admin.id, updatedAt },
    { key: "faq_entries", value: JSON.stringify(validatedFaqEntries), updatedBy: admin.id, updatedAt },
    { key: "publication_rules", value: JSON.stringify(validatedPublicationRules), updatedBy: admin.id, updatedAt },
    { key: "publication_rules_updated_at", value: updatedAt, updatedBy: admin.id, updatedAt },
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
