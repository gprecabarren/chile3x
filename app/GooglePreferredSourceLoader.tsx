"use client";

import { useEffect } from "react";

type PreferredSource = {
  init: (options: { theme: "dark"; lang: string }) => void;
  addPreferredSource: () => void;
};

type PreferredSourceWindow = Window & typeof globalThis & {
  PREFERRED_SOURCE?: Array<(source: PreferredSource) => void>;
  __chile3xPreferredSource?: PreferredSource;
};

const publisherScriptId = "google-preferred-source-library";

/**
 * Loads Google's optional Preferred Sources library after React hydration.
 * Keeping it client-only avoids third-party changes in <head> causing a
 * server/client HTML mismatch while the footer link keeps its direct fallback.
 */
export function GooglePreferredSourceLoader() {
  useEffect(() => {
    const preferredWindow = window as PreferredSourceWindow;
    if (preferredWindow.__chile3xPreferredSource) return;

    preferredWindow.PREFERRED_SOURCE = preferredWindow.PREFERRED_SOURCE ?? [];
    preferredWindow.PREFERRED_SOURCE.push((source) => {
      preferredWindow.__chile3xPreferredSource = source;
      source.init({ theme: "dark", lang: "es-419" });
    });

    if (document.getElementById(publisherScriptId)) return;
    const script = document.createElement("script");
    script.id = publisherScriptId;
    script.src = "https://news.google.com/swg/js/v1/publisher.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
