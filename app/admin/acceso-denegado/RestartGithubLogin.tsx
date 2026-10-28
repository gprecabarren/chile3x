"use client";
import { useEffect, useRef } from "react";
import { ActionAnchor } from "@/app/ActionButton";

/** The logout POST has already revoked the local identity. Start a new
 * document navigation so CSP never follows a submitted form off-site. */
export function RestartGithubLogin() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.location.replace("/api/auth/github/start?select_account=1");
  }, []);
  return <><h1>Elige tu cuenta de GitHub.</h1><span>Preparando un nuevo inicio de sesión. Si no avanzas automáticamente, continúa con el botón.</span><div className="admin-denied-actions"><ActionAnchor className="button button-primary" href="/api/auth/github/start?select_account=1">Continuar con GitHub</ActionAnchor></div></>;
}
