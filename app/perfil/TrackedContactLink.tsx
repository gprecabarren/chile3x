"use client";

import type { ComponentProps, ReactNode } from "react";
import { trackAnalyticsEvent } from "@/app/AnalyticsEvent";
import { isAdministrativeBrowser } from "@/lib/browser-measurement";

export function TrackedContactLink({ profileId, kind, children, preview = false, ...props }: { profileId: string; preview?:boolean; kind: "whatsapp" | "telegram" | "call" | "email" | "instagram" | "arsmate" | "onlyfans" | "videocall"; children: ReactNode } & Omit<ComponentProps<"a">, "children">) {
  function track() {
    if (isAdministrativeBrowser()) return;
    trackAnalyticsEvent("profile_contact_click", { contact_method: kind });
    void fetch(`/api/perfiles/${profileId}/contacto`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }), keepalive: true }).catch(() => {});
  }
  return <a {...props} href={preview?undefined:props.href} role={preview?"link":undefined} aria-disabled={preview||undefined} onClick={(event) => { if(preview){event.preventDefault();return;} props.onClick?.(event); if (!event.defaultPrevented) track(); }}>{children}</a>;
}
