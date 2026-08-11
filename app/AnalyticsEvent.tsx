"use client";

import { useEffect } from "react";
import { hasAnalyticsConsent } from "@/app/PrivacyConsent";

type AnalyticsValue = string | number | boolean;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, AnalyticsValue>>;
  }
}

/**
 * Sends only aggregate, non-identifying interaction data to Tag Manager.
 * Never add names, emails, phone numbers, RUTs, profile IDs or free text.
 */
export function trackAnalyticsEvent(event: string, parameters: Record<string, AnalyticsValue> = {}) {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...parameters });
}

export function AnalyticsEvent({
  event,
  parameters,
  dedupeKey,
}: {
  event: string;
  parameters?: Record<string, AnalyticsValue>;
  dedupeKey?: string;
}) {
  useEffect(() => {
    const key = dedupeKey ? `chile3x:analytics:${event}:${dedupeKey}` : null;
    if (key && window.sessionStorage.getItem(key)) return;
    trackAnalyticsEvent(event, parameters);
    if (key) window.sessionStorage.setItem(key, "1");
  }, [dedupeKey, event, parameters]);

  return null;
}
