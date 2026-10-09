"use client";

import type { ComponentProps } from "react";
import type { WhatsappPlacement } from "@/lib/portal-whatsapp";
import { trackAnalyticsEvent } from "./AnalyticsEvent";

// Internal anonymous counters are independent of optional, consented Google
// measurement. Neither path receives numbers, messages or personal labels.
export function recordPortalWhatsapp(action: "panel_open" | "contact_click", contactId: string, placement: WhatsappPlacement) {
  void fetch("/api/contacto/whatsapp", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, contactId, placement }), keepalive: true,
  }).catch(() => { /* Contact navigation must work even if measurement fails. */ });
  const area = action === "panel_open" ? "panel" : contactId === "support" ? "support" : contactId === "marketing" ? "marketing" : "other";
  try {
    trackAnalyticsEvent(action === "panel_open" ? "portal_whatsapp_panel_open" : "portal_whatsapp_contact_click", {
      contact_area: area, contact_placement: placement,
    });
  } catch { /* Optional measurement must never block the panel or contact. */ }
}

export function PortalWhatsappLink({ placement, contactId = "support", ...props }: ComponentProps<"a"> & { placement: WhatsappPlacement; contactId?: string }) {
  return <a {...props} onClick={event => {
    props.onClick?.(event);
    if (!event.defaultPrevented) recordPortalWhatsapp("contact_click", contactId, placement);
  }} />;
}
