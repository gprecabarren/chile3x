"use client";
import { ActionButton } from "@/app/ActionButton";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "@/app/NavigationLink";
import "./account-workspace.css";
import { ActionIcon } from "@/app/ActionIcon";

export function AccountWorkspace({ brand, toolbarBrand, navigation, identity, children }: {
  brand: ReactNode;
  toolbarBrand: ReactNode;
  navigation: ReactNode;
  identity: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1100px)");
    const closeOnDesktop = () => { if (media.matches) setMobileOpen(false); };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocusTarget = mobileToggle.current;
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => closeButton.current?.focus());

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const controls = [...(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') ?? [])]
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !sidebar.current?.contains(document.activeElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebar.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", keydown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      returnFocusTarget?.focus({ preventScroll: true });
    };
  }, [mobileOpen]);

  const hamburger = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
  return <div className={`account-workspace${collapsed ? " is-desktop-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}>
    {mobileOpen && <ActionButton className="account-sidebar-backdrop" aria-label="Cerrar menú de mi cuenta" type="button" onClick={() => setMobileOpen(false)} />}
    <aside className="account-sidebar" id="account-sidebar" ref={sidebar} role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen || undefined} aria-label="Menú de mi cuenta" inert={collapsed && !mobileOpen || undefined} onClick={event => { if (event.target instanceof Element && event.target.closest("a[href]")) setMobileOpen(false); }}>
      <div className="account-sidebar-head">{brand}<ActionButton className="account-drawer-close" type="button" ref={closeButton} aria-label="Cerrar menú de mi cuenta" onClick={() => setMobileOpen(false)}>×</ActionButton></div>
      <div className="account-sidebar-navigation">{navigation}</div>
      <footer className="account-sidebar-footer">{identity}</footer>
    </aside>
    <main className="account-root" inert={mobileOpen || undefined}>
      <header className="account-toolbar">
        <ActionButton className="account-desktop-toggle" type="button" aria-label={collapsed ? "Expandir menú de mi cuenta" : "Contraer menú de mi cuenta"} aria-expanded={!collapsed} aria-controls="account-sidebar" onClick={() => setCollapsed(value => !value)}>{hamburger}</ActionButton>
        <ActionButton className="account-mobile-toggle" type="button" ref={mobileToggle} aria-label="Abrir menú de mi cuenta" aria-expanded={mobileOpen} aria-controls="account-sidebar" onClick={() => setMobileOpen(true)}>{hamburger}</ActionButton>
        <div className="account-toolbar-brand">{toolbarBrand}</div><Link className="button button-primary account-toolbar-stories" href="/mi-cuenta/historias">Subir historias</Link><Link className="account-view-site" href="/"><ActionIcon name="back" /><span>Volver al sitio web</span></Link>
      </header>
      {children}
    </main>
  </div>;
}
