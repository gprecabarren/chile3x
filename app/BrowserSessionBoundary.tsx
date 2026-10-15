"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isProtectedSessionPath, parseSessionView, sessionViewsMatch, type SessionView } from "@/lib/session-view-policy";

const SYNC_KEY = "chile3x:session-check:v1";
type CheckState = { phase: "ready" | "checking" | "offline" | "changed"; current: SessionView | null };

/** Keeps old tabs/RSC snapshots from impersonating the newly active identity.
 * Server readers remain the sole authority for every protected action. */
export function BrowserSessionBoundary({ initial, children }: { initial: SessionView; children: ReactNode }) {
  const pathname = usePathname();
  const { mode, identity } = initial;
  const protectedView = isProtectedSessionPath(pathname);
  const [state, setState] = useState<CheckState>({ phase: "ready", current: null });
  const announced = useRef(false);
  const retry = useRef<() => void>(() => {});

  useEffect(() => {
    const expected = { mode, identity };
    let stopped = false, inFlight = false, queued = false;
    let requestVersion = 0;
    let activeController: AbortController | null = null;
    async function verify(suspend = false) {
      if (stopped || document.visibilityState !== "visible") return;
      const version = ++requestVersion;
      if (suspend && mode && protectedView) setState(previous => previous.phase === "changed" ? previous : { ...previous, phase: "checking" });
      if (inFlight) { queued = true; return; }
      inFlight = true;
      const controller = new AbortController();
      activeController = controller;
      const timeout = window.setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch("/api/auth/session/state", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        const actual = response.status === 409 || response.status === 401 ? { mode: null, identity: null } : response.ok ? parseSessionView(await response.json()) : null;
        if (stopped || version !== requestVersion) return;
        if (!actual) throw new Error("Session verification unavailable");
        if (!sessionViewsMatch(expected, actual)) {
          setState({ phase: "changed", current: actual });
          // A full public reload discards cached role-specific controls.
          // Never auto-reload an old admin URL into a fresh GitHub OAuth flow.
          // A late successful OAuth response can reach the denial page before
          // its cookie. Re-render that public error surface with fresh auth;
          // the page still checks the grant/reason before resuming the panel.
          if (!protectedView || (pathname === "/admin/acceso-denegado" && actual.mode === "admin")) window.location.reload();
        } else setState(previous => previous.phase === "changed" ? { ...previous, current: actual } : { phase: "ready", current: actual });
      } catch {
        if (!stopped && version === requestVersion) setState(previous => previous.phase === "changed" ? previous : { ...previous, phase: mode ? "offline" : "ready" });
      } finally {
        window.clearTimeout(timeout);
        inFlight = false;
        if (!stopped && queued) { queued = false; void verify(); }
      }
    }
    // Focus/history checks are silent. The server already verified this render;
    // only a confirmed mismatch or failure should interrupt the current page.
    const check = () => void verify();
    retry.current = () => void verify(true);
    const visibility = () => {
      if (document.visibilityState === "visible") check();
      else if (mode && protectedView) {
        requestVersion++;
        activeController?.abort();
      }
    };
    const storage = (event: StorageEvent) => { if (event.key === SYNC_KEY) check(); };
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    window.addEventListener("popstate", check);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", visibility);
    if (!announced.current) {
      announced.current = true;
      try { localStorage.setItem(SYNC_KEY, `${Date.now()}:${Math.random()}`); } catch { /* Focus/pageshow checks still work when storage is unavailable. */ }
    }
    // An anonymous server render already has no protected identity to retain.
    if (mode) check();
    const timer = mode ? window.setInterval(() => void verify(), 60_000) : null;
    return () => {
      stopped = true;
      activeController?.abort();
      if (timer !== null) window.clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      window.removeEventListener("popstate", check);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", visibility);
      retry.current = () => {};
    };
  }, [mode, identity, pathname, protectedView]);

  if (state.phase === "changed") return <main className="session-change-screen"><section role="alert"><p className="eyebrow">SEGURIDAD DE LA SESIÓN</p><h1>Tu sesión cambió</h1><p>La identidad activa cambió en otra pestaña o tu sesión terminó. Esta vista se cerró para evitar mezclar cuentas. No se modificaron tus datos ni tus permisos.</p><a className="button button-primary" href={state.current?.mode === "admin" ? "/admin" : state.current?.mode === "account" ? "/mi-cuenta" : "/ingresar?error=session_changed"}>{state.current?.mode === "admin" ? "Ir a administración" : state.current?.mode === "account" ? "Ir a mi cuenta" : "Iniciar sesión"}</a></section></main>;
  const blocked = Boolean(mode && protectedView && state.phase !== "ready");
  return <>
    {blocked && <main className="session-change-screen session-check-screen"><section role="status"><p className="eyebrow">SEGURIDAD DE LA SESIÓN</p><h1>{state.phase === "offline" ? "No pudimos comprobar tu sesión" : "Comprobando tu sesión"}</h1><p>{state.phase === "offline" ? "La vista anterior permanece oculta por seguridad. Revisa tu conexión e inténtalo nuevamente; tus campos no se han borrado." : "Estamos confirmando la identidad activa de este navegador."}</p>{state.phase === "offline" && <button className="button button-primary" type="button" onClick={() => retry.current()}>Reintentar</button>}</section></main>}
    {!protectedView && state.phase === "offline" && <div className="session-check-notice" role="alert">No se pudo actualizar el estado de tu sesión. Puedes seguir usando esta página o <button type="button" onClick={() => retry.current()}>Reintentar</button></div>}
    <div className="browser-session-boundary" data-session-checking={blocked ? "true" : undefined} inert={blocked || undefined} aria-hidden={blocked || undefined} aria-busy={blocked || undefined}>{children}</div>
  </>;
}
