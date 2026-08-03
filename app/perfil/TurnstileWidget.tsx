"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = { render: (element: HTMLElement, options: { sitekey: string; action: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string; reset: (widgetId?: string) => void };
declare global { interface Window { turnstile?: TurnstileApi } }

function loadTurnstile() {
  return new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const existing = document.getElementById("cf-turnstile-script") as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile no disponible.")), { once: true });
    script.addEventListener("error", () => reject(new Error("No se pudo cargar la protección antispam.")), { once: true });
    if (!existing) {
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
}

export function TurnstileWidget({ action, sitekey, resetKey, onToken, onError }: { action: string; sitekey: string; resetKey: number; onToken: (token: string) => void; onError: (message: string) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    loadTurnstile().then((api) => {
      if (!active || !element.current) return;
      if (widgetId.current) api.reset(widgetId.current);
      else widgetId.current = api.render(element.current, { sitekey, action, callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => onToken("") });
    }).catch((cause) => active && onError(cause instanceof Error ? cause.message : "No se pudo cargar Turnstile."));
    return () => { active = false; };
  }, [action, sitekey, resetKey, onError, onToken]);
  return <div className="turnstile-widget" ref={element} />;
}
