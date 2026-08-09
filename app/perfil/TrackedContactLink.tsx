"use client";

import type { ComponentProps, ReactNode } from "react";
import { trackAnalyticsEvent } from "@/app/AnalyticsEvent";

export function TrackedContactLink({ profileId, kind, children, ...props }: { profileId: string; kind: "whatsapp" | "telegram" | "call" | "email" | "instagram" | "arsmate" | "onlyfans" | "videocall"; children: ReactNode } & Omit<ComponentProps<"a">, "children">) {
  function track() {
    trackAnalyticsEvent("profile_contact_click", { contact_method: kind });
    void fetch(`/api/perfiles/${profileId}/contacto`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }), keepalive: true });
  }
  return <a {...props} onClick={(event) => { props.onClick?.(event); if (!event.defaultPrevented) track(); }}>{children}</a>;
}
