"use client";

import { useEffect, useRef, useState } from "react";
import { OfficialChile3xLogo } from "./OfficialChile3xLogo";

export function FormProgress() {
  const [active, setActive] = useState(false);
  const [delayed, setDelayed] = useState(false);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reset = () => {
      setActive(false);
      setDelayed(false);
      if (delayTimer.current) clearTimeout(delayTimer.current);
    };
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      window.setTimeout(() => {
        if (event.defaultPrevented) return;
        setActive(true);
        setDelayed(false);
        delayTimer.current = setTimeout(() => setDelayed(true), 12_000);
      }, 0);
    };
    document.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", reset);
    return () => {
      document.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", reset);
      if (delayTimer.current) clearTimeout(delayTimer.current);
    };
  }, []);

  if (!active) return null;
  return <div className="form-progress-overlay" role="status" aria-live="polite" aria-busy={!delayed}>
    <div className={delayed ? "is-delayed" : undefined}><OfficialChile3xLogo />{!delayed && <span className="form-progress-spinner" aria-hidden="true" />}<strong>{delayed ? "La respuesta está demorada" : "Procesando…"}</strong><p>{delayed ? "Cloudflare o tu conexión no respondieron dentro del tiempo esperado. Espera unos segundos y evita enviar el formulario nuevamente mientras la pestaña siga cargando." : "Estamos guardando o aplicando los filtros."}</p>{delayed && <button className="button button-outline" type="button" onClick={() => setActive(false)}>Cerrar aviso</button>}</div>
  </div>;
}
