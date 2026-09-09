"use client";

import { useEffect, useRef, useState } from "react";

type GoogleCredentialResponse = { credential?: string };
type GoogleIdentityServices = {
  accounts: { id: {
    initialize(options: { client_id: string; callback: (response: GoogleCredentialResponse) => void; nonce: string; ux_mode: "popup" }): void;
    renderButton(element: HTMLElement, options: { locale: string; shape: "rectangular"; size: "large"; text: "signin_with" | "signup_with"; theme: "outline"; type: "standard"; width: number }): void;
  } };
};

declare global {
  interface Window { google?: GoogleIdentityServices }
}

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google?.accounts.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    const script = existing ?? document.createElement("script");
    const onLoad = () => resolve();
    const onError = () => reject(new Error("No fue posible cargar Google"));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  return googleScriptPromise;
}

export function GoogleSignInButton({ clientId, intent, returnTo }: {
  clientId: string;
  intent: "login" | "register";
  returnTo: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    async function setup() {
      try {
        const nonceResponse = await fetch("/api/auth/google/nonce", { cache: "no-store", credentials: "same-origin" });
        const { nonce } = await nonceResponse.json() as { nonce?: string };
        if (!nonceResponse.ok || !nonce) throw new Error("No se pudo iniciar la conexión segura con Google.");
        await loadGoogleScript();
        if (cancelled || !containerRef.current || !window.google?.accounts.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          nonce,
          ux_mode: "popup",
          callback: async ({ credential }) => {
            if (!credential || busyRef.current) return;
            busyRef.current = true;
            setBusy(true);
            setNotice("Validando tu cuenta de Google…");
            try {
              const response = await fetch("/api/auth/google", {
                method: "POST",
                credentials: "same-origin",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ credential, intent, returnTo }),
              });
              const payload = await response.json() as { redirectTo?: string; error?: string };
              if (!response.ok || !payload.redirectTo) throw new Error(payload.error || "No se pudo continuar con Google.");
              window.location.assign(payload.redirectTo);
            } catch (error) {
              busyRef.current = false;
              setBusy(false);
              setNotice(error instanceof Error ? error.message : "No se pudo continuar con Google.");
            }
          },
        });
        const render = () => {
          if (!containerRef.current || !window.google?.accounts.id) return;
          const width = Math.max(200, Math.min(400, Math.floor(containerRef.current.clientWidth)));
          containerRef.current.replaceChildren();
          window.google.accounts.id.renderButton(containerRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: intent === "register" ? "signup_with" : "signin_with",
            shape: "rectangular",
            locale: "es",
            width,
          });
        };
        render();
        observer = new ResizeObserver(render);
        observer.observe(containerRef.current);
      } catch (error) {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "No se pudo cargar Google.");
      }
    }
    setup();
    return () => { cancelled = true; observer?.disconnect(); };
  }, [clientId, intent, returnTo]);

  return <div className={`google-signin${busy ? " is-busy" : ""}`} aria-busy={busy}>
    <div ref={containerRef} className="google-signin-button" />
    {notice && <small role="status">{notice}</small>}
  </div>;
}
