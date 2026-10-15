"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { needsBrowserSessionKey } from "@/lib/session-policy";
import { ensureBrowserSession } from "@/public/assets/browser-session-bootstrap-v1.js";

export function BrowserSessionSetup({ children }: { children: ReactNode }) {
  const needed = needsBrowserSessionKey(usePathname());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!needed || ready) return;
    let stopped = false;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 10_000);
    void ensureBrowserSession(controller.signal).then(() => {
      if (!stopped) { setReady(true); setError(""); }
    }).catch((failure: unknown) => {
      if (!stopped) setError(failure instanceof Error && failure.name !== "AbortError" ? failure.message : "No pudimos preparar el acceso. Revisa tu conexión y vuelve a intentarlo.");
    }).finally(() => window.clearTimeout(timer));
    return () => { stopped = true; controller.abort(); window.clearTimeout(timer); };
  }, [needed, ready, attempt]);
  if (!needed || ready) return children;
  return <main className="session-change-screen session-check-screen"><section role={error ? "alert" : "status"}><p className="eyebrow">ACCESO SEGURO</p><h1>{error ? "No pudimos preparar el acceso" : "Preparando acceso seguro"}</h1><p>{error || "Estamos preparando este navegador para mantener una sola identidad activa entre tus pestañas."}</p>{error && <button className="button button-primary" type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Reintentar</button>}</section></main>;
}
