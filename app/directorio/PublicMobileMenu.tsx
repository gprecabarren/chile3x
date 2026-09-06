"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PublicMobileMenuProps = {
  hasUserSession: boolean;
  hasAdminSession: boolean;
  session?: {
    label: string;
    username: string | null;
    email: string;
    accountHref: string;
    accountLabel: string;
    isAdmin: boolean;
  } | null;
};

const portalLinks = [
  ["Quiénes somos", "/quienes-somos"],
  ["Noticias", "/noticias"],
  ["Preguntas frecuentes", "/faq"],
  ["Contacto", "/contacto"],
] as const;

export function PublicMobileMenu({ hasUserSession = false, hasAdminSession = false, session = null }: PublicMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => setOpen(false);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="mobile-public-menu">
      <button
        type="button"
        className="mobile-menu-toggle"
        ref={toggleRef}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="public-mobile-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="mobile-menu-icon" aria-hidden="true"><i /><i /><i /></span>
        <span>Menú</span>
      </button>
      {open && (
        <div id="public-mobile-navigation" className="mobile-menu-panel" role="navigation" aria-label="Navegación principal">
          <div className="mobile-menu-directory-extra">
            <p>DIRECTORIO</p>
            <Link href="/agencias" onClick={closeMenu}>Agencias</Link>
            <Link href="/arriendos" onClick={closeMenu}>Arriendos</Link>
          </div>
          <div>
            <p>CHILE3X</p>
            {portalLinks.map(([label, href]) => <Link href={href} onClick={closeMenu} key={href}>{label}</Link>)}
          </div>
          {session && <div className="mobile-menu-session-summary">
            <p>{session.isAdmin ? "SESIÓN ADMINISTRATIVA" : "SESIÓN ACTIVA"}</p>
            <Link href={session.accountHref} onClick={closeMenu}>
              <strong>{session.label}</strong>
              <small>{session.username ? `@${session.username} · ` : ""}{session.email}</small>
            </Link>
          </div>}
          {(hasUserSession || hasAdminSession) && <div className="mobile-menu-session-actions">
            <p>SESIÓN</p>
            {hasUserSession && <form action="/api/auth/session/logout" method="post"><button type="submit">Cerrar sesión</button></form>}
            {hasAdminSession && <form action="/api/auth/logout" method="post"><button type="submit">Cerrar sesión de administrador</button></form>}
          </div>}
        </div>
      )}
    </div>
  );
}
