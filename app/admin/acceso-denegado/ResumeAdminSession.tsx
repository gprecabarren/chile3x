"use client";
import { useEffect, useState } from "react";
import { parseSessionView } from "@/lib/session-view-policy";

export function ResumeAdminSession({ initialConfirmed, failureMessage }: { initialConfirmed: boolean; failureMessage: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (initialConfirmed) { window.location.replace("/admin"); return; }
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    // A duplicate callback can arrive before the successful response's cookie.
    // Confirm via new requests; never infer an admin grant from a public user.
    void (async () => {
      for (const delay of [0, 350, 800]) {
        if (delay) await new Promise<void>(resolve => { retryTimer = setTimeout(resolve, delay); });
        if (stopped) return;
        try {
          const response = await fetch("/api/auth/session/state", { credentials: "same-origin", cache: "no-store", signal: controller.signal });
          const session = response.ok ? parseSessionView(await response.json()) : null;
          if (!stopped && session?.mode === "admin") { window.location.replace("/admin"); return; }
        } catch { /* A bounded fresh check may still observe the completed login. */ }
      }
      if (!stopped) setFailed(true);
    })().finally(() => window.clearTimeout(timeout));
    return () => { stopped = true; controller.abort(); clearTimeout(retryTimer); window.clearTimeout(timeout); };
  }, [initialConfirmed]);
  return <div role={failed ? "alert" : "status"}><h1>{failed ? "No se pudo completar el inicio de sesión." : "Confirmando acceso administrativo"}</h1><span>{failed ? failureMessage : "Estamos comprobando el resultado del acceso antes de mostrar un error. Si tu sesión ya quedó iniciada, abriremos el panel automáticamente."}</span></div>;
}
