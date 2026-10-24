"use client";
import { ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";

import { PublicNavigationLink as Link } from "./PublicNavigationLink";
import { useEffect, useRef, useState } from "react";

type PublicMobileMenuProps = {
  hasUserSession: boolean;
  hasAdminSession: boolean;
  showSponsors?: boolean;
  session?: {
    label: string;
    username: string | null;
    email: string;
    accountHref: string;
    accountLabel: string;
    isAdmin: boolean;
    detail: string;
  } | null;
};

const portalLinks = [
  ["Quiénes somos", "/quienes-somos"],
  ["Noticias", "/noticias"],
  ["Novedades", "/novedades"],
  ["Preguntas frecuentes", "/faq"],
  ["Contacto", "/contacto"],
] as const;

export function PublicMobileMenu({ hasUserSession = false, hasAdminSession = false, showSponsors = false, session = null }: PublicMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeMenu = () => setOpen(false);
  const dismissMenu = () => {
    setOpen(false);
    toggleRef.current?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggleRef.current?.focus({ preventScroll: true });
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !panelRef.current?.contains(event.target) && !toggleRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div className="mobile-public-menu">
      <ActionButton
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
      </ActionButton>
      {open && (
        <div id="public-mobile-navigation" ref={panelRef} className="mobile-menu-panel" role="navigation" aria-label="Navegación principal">
          <div className="mobile-menu-heading">
            <span>Navegación</span>
            <ActionButton type="button" className="mobile-menu-close" ref={closeRef} aria-label="Cerrar menú principal" onClick={dismissMenu}><ActionIcon name="close" /></ActionButton>
          </div>
          <div className="mobile-menu-directory-extra">
            <p>DIRECTORIO</p>
            <Link href="/agencias" onClick={closeMenu}>Agencias</Link>
            <Link href="/arriendos" onClick={closeMenu}>Arriendos</Link>
            <Link href="/venta-contenido" onClick={closeMenu}>Venta de contenido</Link>
          </div>
          <div>
            <p>CHILE3X</p>
            {portalLinks.map(([label, href]) => <Link href={href} onClick={closeMenu} key={href}>{label}</Link>)}
            {showSponsors && <Link href="/patrocinadores" onClick={closeMenu}>Sitios asociados</Link>}
          </div>
          {session && <div className="mobile-menu-session-summary">
            <p>{session.isAdmin ? "SESIÓN ADMINISTRATIVA" : "SESIÓN ACTIVA"}</p>
            <Link href={session.accountHref} onClick={closeMenu}>
              <strong>{session.label}</strong>
              <small>{session.detail}</small>
            </Link>
          </div>}
          {(hasUserSession || hasAdminSession) && <div className="mobile-menu-session-actions">
            <p>SESIÓN</p>
            {hasUserSession && <form action="/api/auth/session/logout" method="post"><ActionButton type="submit">Cerrar sesión</ActionButton></form>}
            {hasAdminSession && <form action="/api/auth/logout" method="post"><ActionButton type="submit">Cerrar sesión administrador</ActionButton></form>}
          </div>}
        </div>
      )}
    </div>
  );
}
