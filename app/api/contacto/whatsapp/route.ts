import { sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { portalWhatsappEvents } from "@/db/schema";
import { assertSameOrigin } from "@/lib/auth";
import { chileanDay } from "@/lib/chile-day";
import { getSiteSettings } from "@/lib/site-settings";
import { publicWhatsappContacts, validateWhatsappEvent } from "@/lib/portal-whatsapp";

const reply = (status: number) => new Response(null, { status, headers: { "cache-control": "no-store" } });

async function smallJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json") || !request.body) return null;
  if (Number(request.headers.get("content-length") ?? 0) > 512) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 512) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return null; }
  finally { reader.releaseLock(); }
}

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return reply(403); }
  const event = validateWhatsappEvent(await smallJson(request));
  if (!event) return reply(400);
  const settings = await getSiteSettings();
  const contacts = publicWhatsappContacts(settings);
  if (event.placement === "floating" && settings.whatsapp_panel_enabled !== "enabled") return reply(204);
  const contact = contacts.find(item => item.id === event.contactId);
  if (event.action === "contact_click" && !contact) return reply(204);
  if (event.action === "panel_open" && !contacts.length) return reply(204);
  const recordedOn = chileanDay();
  // The primary key bounds storage to one row per day/contact/source/action.
  // The increment is atomic even if visitors click concurrently.
  try {
    await (await getDb()).insert(portalWhatsappEvents).values({
      id: `${recordedOn}:${event.contactId}:${event.placement}:${event.action}`,
      recordedOn, contactId: event.contactId, contactLabel: contact?.label ?? "Panel de contactos",
      action: event.action, placement: event.placement,
    }).onConflictDoUpdate({ target: portalWhatsappEvents.id, set: {
      hits: sql`${portalWhatsappEvents.hits} + 1`, contactLabel: contact?.label ?? "Panel de contactos",
    } });
  } catch {
    // Observability records the failure; the user must never lose contact access.
    console.error("Portal WhatsApp aggregate unavailable");
    return reply(503);
  }
  return reply(204);
}
