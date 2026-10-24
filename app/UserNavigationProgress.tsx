"use client";
import { ActionButton } from "@/app/ActionButton";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { USER_NAVIGATION_START } from "@/lib/user-navigation-progress";

export function UserNavigationProgress({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [visible, setVisible] = useState(false);
  const [slow, setSlow] = useState(false);
  const target = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reset = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = []; target.current = null; setVisible(false); setSlow(false);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const start = (event: Event) => {
      if (!(event instanceof CustomEvent) || typeof event.detail !== "string") return;
      reset(); target.current = event.detail;
      timers.current = [setTimeout(() => setVisible(true), 160), setTimeout(() => setSlow(true), 12_000)];
    };
    window.addEventListener(USER_NAVIGATION_START, start);
    window.addEventListener("pageshow", reset);
    return () => { window.removeEventListener(USER_NAVIGATION_START, start); window.removeEventListener("pageshow", reset); reset(); };
  }, [enabled, reset]);
  useEffect(() => {
    if (target.current === `${pathname}${search ? `?${search}` : ""}`) reset();
  }, [pathname, search, reset]);
  if (!enabled || !visible || /^\/(?:admin|foro)(?:\/|$)/.test(pathname)) return null;
  return <div className="user-navigation-progress" role="status" aria-live="polite">
    <span className="route-loading-hearts" aria-hidden="true"><i>♥</i><i>♥</i></span>
    <div><strong>{slow ? "La carga está tardando más de lo habitual" : "Cargando…"}</strong><span>{slow ? "Puedes seguir esperando. Evita repetir la misma acción." : "Estamos abriendo la sección que elegiste."}</span></div>
    {slow && <ActionButton type="button" onClick={reset} aria-label="Cerrar aviso de carga">×</ActionButton>}
  </div>;
}
