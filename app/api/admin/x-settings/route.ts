import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { siteSettings, xAuthAttempts, xRegistrationIntents } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { recordAdminAudit } from "@/lib/admin-audit";
import { encryptXClientSecret, validXClientId, validXClientSecret } from "@/lib/x-secrets";
import { readXServerCredentials, X_PRIVATE_SECRET_SETTING } from "@/lib/x-settings";
import { getSiteSettings } from "@/lib/site-settings";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "settings.manage")) return new Response("No tienes permiso para configurar X.", { status: 403 });
  const form = await request.formData();
  const status = form.get("x_sign_in_status"), id = form.get("x_oauth_client_id"), inputSecret = form.get("x_oauth_client_secret");
  if ((status !== "disabled" && status !== "enabled") || typeof id !== "string" || typeof inputSecret !== "string") return new Response("Configuración no válida.", { status: 400 });
  const clientId = id.trim(), newSecret = inputSecret.trim();
  if ((clientId && !validXClientId(clientId)) || (newSecret && !validXClientSecret(newSecret))) return new Response("Revisa el formato y la longitud de las credenciales de X.", { status: 400 });
  const currentSettings = await getSiteSettings();
  let credentials: Awaited<ReturnType<typeof readXServerCredentials>>;
  try { credentials = await readXServerCredentials(); } catch { return new Response("No fue posible leer la configuración privada de X. Contacta al equipo técnico.", { status: 503 }); }
  const effectiveClientId = clientId || credentials.fallbackClientId;
  if (effectiveClientId !== credentials.clientId && credentials.clientSecret && !newSecret) return new Response("Al cambiar el Client ID, introduce también el Client Secret de la misma aplicación. No se guardaron cambios.", { status: 400 });
  if (status === "enabled") {
    if (form.get("x_activation_confirmed") !== "on") return new Response("Confirma que revisaste la configuración, disponibilidad y requisitos de X antes de activarlo.", { status: 400 });
    if (!effectiveClientId || !(newSecret || credentials.clientSecret)) return new Response("Completa Client ID y Client Secret antes de activar X.", { status: 400 });
  }
  const updatedAt = new Date().toISOString();
  const rows = [{ key: "x_sign_in_status", value: status, updatedBy: admin.id, updatedAt }, { key: "x_oauth_client_id", value: clientId, updatedBy: admin.id, updatedAt }];
  if (newSecret) {
    try {
      const { env } = await import("cloudflare:workers");
      const value = await encryptXClientSecret(newSecret, env.X_SETTINGS_ENCRYPTION_KEY?.trim() ?? "");
      rows.push({ key: X_PRIVATE_SECRET_SETTING, value, updatedBy: admin.id, updatedAt });
    } catch { return new Response("Falta la clave de cifrado del servidor. El secreto no se guardó.", { status: 503 }); }
  }
  const db = await getDb();
  await db.batch([
    db.delete(xAuthAttempts), db.delete(xRegistrationIntents),
    ...rows.map(row => db.insert(siteSettings).values(row).onConflictDoUpdate({ target: siteSettings.key, set: { value: row.value, updatedBy: admin.id, updatedAt } })),
  ]);
  await recordAdminAudit(admin, { category: "settings", action: "settings.update", summary: `Actualizó el acceso con X (${status === "enabled" ? "activado" : "deshabilitado"}).`, entityType: "settings", entityId: "/admin/configuracion/x", entityLabel: "Inicio con X", before: { status: currentSettings.x_sign_in_status, clientId: credentials.clientId, secretConfigured: Boolean(credentials.clientSecret) }, after: { status, clientId: effectiveClientId, secretChanged: Boolean(newSecret) }, metadata: { changedKeys: rows.map(row => row.key) } });
  return NextResponse.redirect(new URL("/admin/configuracion/x?saved=1", request.url), 303);
}
