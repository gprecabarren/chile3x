"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DAY_MS } from "@/lib/email-verification-policy";

// Also mounted in the root for public-page navigation and suspended mobile tabs.
export function EmailVerificationDeadline({ deadline }: { deadline: number }) {
  useEffect(() => {
    function check() {
      if (Date.now() < deadline || ["/verificar-correo", "/ingresar", "/registro", "/recuperar-clave", "/restablecer-clave", "/reactivar-cuenta"].includes(window.location.pathname) || window.location.pathname.startsWith("/admin")) return;
      window.location.replace("/verificar-correo");
    }
    const timer = window.setTimeout(check, Math.max(0, Math.min(2_147_483_647, deadline - Date.now())));
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", check);
    check();
    return () => { window.clearTimeout(timer); window.removeEventListener("pageshow", check); document.removeEventListener("visibilitychange", check); };
  }, [deadline]);
  return null;
}

export function EmailVerificationNotice({ deadline, compact = false }: { deadline: number; compact?: boolean }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, [deadline]);
  const countdown = remaining === null ? "Calculando plazo…" : `${Math.floor(remaining / DAY_MS)} días · ${Math.floor(remaining % DAY_MS / 3_600_000)} h · ${Math.floor(remaining % 3_600_000 / 60_000)} min`;
  return <aside className="email-verification-notice" aria-label="Verificación pendiente">
    <div><strong>{compact ? "Plazo para confirmar tu correo" : "Verifica tu correo para mantener el acceso"}</strong>{!compact && <p>Puedes usar tu cuenta durante 7 días desde el registro. Después tendrás que verificar el correo para continuar. Tus anuncios y fotos se conservan.</p>}<span>Tiempo restante: {countdown}</span></div>
    {!compact && <Link className="button button-outline" href="/verificar-correo" prefetch={false}>Verificar o reenviar enlace</Link>}
  </aside>;
}
