import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { recordAdminAudit } from "@/lib/admin-audit";
import { readMailSettingsForm } from "@/lib/mail-settings-policy";
import { encryptMailSecret, MAIL_SECRET_KEY, readMailCredentials } from "@/lib/mail-credentials";
import { getSiteSettings } from "@/lib/site-settings";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "settings.manage")) return new Response("No tienes permiso para configurar el correo.", { status: 403 });
  const form = await request.formData();
  let values: Record<string, string>;
  try { values = readMailSettingsForm(form); } catch (error) { return new Response(error instanceof Error ? error.message : "Revisa la configuración.", { status: 400 }); }
  const rawSecret = form.get("mail_relay_secret");
  if (typeof rawSecret !== "string" || rawSecret && !/^[\x21-\x7e]{32,512}$/.test(rawSecret)) return new Response("El secreto del relay debe tener entre 32 y 512 caracteres sin espacios.", { status: 400 });
  const current = await getSiteSettings();
  let credentials: Awaited<ReturnType<typeof readMailCredentials>>;
  try { credentials = await readMailCredentials(); } catch { return new Response("No fue posible leer la configuración privada. No se guardaron cambios.", { status: 503 }); }
  if (values.mail_google_relay_url !== current.mail_google_relay_url && !rawSecret) return new Response("Al cambiar el relay, introduce también el secreto correspondiente. No se guardaron cambios.", { status: 400 });
  if (values.mail_delivery_mode === "google" && (!(values.mail_google_relay_url || credentials.fallbackUrl) || !(rawSecret || credentials.secret))) return new Response("Configura el relay y su secreto antes de seleccionar Google.", { status: 400 });
  const updatedAt = new Date().toISOString();
  const rows = Object.entries(values).map(([key, value]) => ({ key, value, updatedBy: admin.id, updatedAt }));
  if (rawSecret) { try { rows.push({ key: MAIL_SECRET_KEY, value: await encryptMailSecret(rawSecret), updatedBy: admin.id, updatedAt }); } catch { return new Response("La clave de cifrado no está disponible. El secreto no se guardó.", { status: 503 }); } }
  const db = await getDb();
  const [first, ...rest] = rows.map(row => db.insert(siteSettings).values(row).onConflictDoUpdate({ target: siteSettings.key, set: { value: row.value, updatedBy: admin.id, updatedAt } }));
  if (!first) return new Response("No se recibieron cambios.", { status: 400 });
  await db.batch([first, ...rest]);
  await recordAdminAudit(admin, { category: "settings", action: "settings.update", summary: "Actualizó la configuración de correo y alertas de moderación.", entityType: "settings", entityId: "/admin/configuracion/correo", entityLabel: "Configuración de correo", before: Object.fromEntries(Object.keys(values).map(key => [key, current[key as keyof typeof current]])), after: { ...values, secretChanged: Boolean(rawSecret) } });
  return NextResponse.redirect(new URL("/admin/configuracion/correo?saved=1", request.url), 303);
}
