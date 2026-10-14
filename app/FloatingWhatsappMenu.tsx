"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { PublicWhatsappContact, WhatsappPanelPlacement } from "@/lib/portal-whatsapp";
import { PortalWhatsappLink, recordPortalWhatsapp } from "./PortalWhatsappLink";
import { WhatsappMenuContext } from "./WhatsappMenuContext";
import Link from "./NavigationLink";
import { TrackedContactLink } from "./perfil/TrackedContactLink";

export type AdvertiserWhatsapp = { profileId: string; name: string; href: string | null; unavailableMessage?: string };

export function FloatingWhatsappMenu({ contacts, title, description, buttonLabel, icon, showFloating = true, children, advertiser }: {
  contacts: PublicWhatsappContact[]; title: string; description: string; buttonLabel: string;
  icon: ReactNode; showFloating?: boolean; children?: ReactNode; advertiser?: AdvertiserWhatsapp;
}) {
  const [placement, setPlacement] = useState<WhatsappPanelPlacement | null>(null);
  const open = placement !== null;
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  function close() {
    setPlacement(null);
    openerRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPlacement(null);
        openerRef.current?.focus({ preventScroll: true });
      } else if (event.key === "Tab") {
        const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)") ?? []);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyboard);
      if (openerRef.current?.isConnected) openerRef.current.focus({ preventScroll: true });
    };
  }, [open]);

  function openMenu(source: WhatsappPanelPlacement, opener: HTMLElement) {
    if (!contacts.length && !advertiser) return false;
    openerRef.current = opener;
    if (!open) recordPortalWhatsapp("panel_open", "panel", source);
    setPlacement(source);
    return true;
  }

  return <WhatsappMenuContext.Provider value={{ isOpen: open, openMenu }}>
    <div inert={open ? true : undefined}>{children}</div>
    {showFloating && (contacts.length > 0 || advertiser) && <div className="portal-whatsapp-widget" inert={open ? true : undefined}>
      <button type="button" className="floating-whatsapp" aria-label={advertiser?.href ? `WhatsApp de ${advertiser.name} y ayuda de Chile3X` : advertiser ? "Contactos de este anuncio y ayuda de Chile3X" : buttonLabel} title={advertiser ? "Contactar al anunciante o al equipo" : buttonLabel}
        aria-expanded={open} aria-haspopup="dialog" onClick={event => openMenu("floating", event.currentTarget)}>{icon}</button>
    </div>}
    {open && createPortal(<div className="portal-whatsapp-backdrop" onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <section className="portal-whatsapp-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <header><div><span>{advertiser ? "CONTACTOS DEL ANUNCIO" : "EQUIPO CHILE3X"}</span><h2 id={titleId}>{advertiser ? "¿Con quién quieres hablar?" : title}</h2></div>
          <button type="button" className="portal-whatsapp-close" ref={closeRef} aria-label="Cerrar contactos de WhatsApp" onClick={close}>×</button>
        </header>
        <p className="portal-whatsapp-explanation" id={descriptionId}>{advertiser ? "Para consultar este anuncio, escribe directamente a su anunciante. El equipo de Chile3X solo atiende soporte y marketing; no coordina citas ni arriendos." : description}</p>
        <div className="portal-whatsapp-options">
          {advertiser?.href && <TrackedContactLink profileId={advertiser.profileId} kind="whatsapp" className="portal-whatsapp-option portal-whatsapp-advertiser" href={advertiser.href} target="_blank" rel="noopener noreferrer" onClick={() => setPlacement(null)} aria-label={`Contactar directamente a ${advertiser.name} por WhatsApp`}>
            <span className="portal-whatsapp-option-icon" aria-hidden="true">{icon}</span><span><small>ANUNCIANTE · CONTACTO DIRECTO</small><strong>{advertiser.name}</strong><small>Consultar este anuncio por WhatsApp →</small></span>
          </TrackedContactLink>}
          {advertiser && !advertiser.href && <aside className="portal-whatsapp-unavailable"><strong>{advertiser.name}</strong><p>{advertiser.unavailableMessage || "Este anuncio no tiene un WhatsApp disponible."}</p><small>Los contactos del equipo no sustituyen al anunciante.</small></aside>}
          {advertiser && contacts.length > 0 && <p className="portal-whatsapp-team-label">AYUDA DEL EQUIPO CHILE3X</p>}
          {contacts.map(contact => <PortalWhatsappLink key={contact.id} placement={placement!} contactId={contact.id}
          className="portal-whatsapp-option" href={contact.href} target="_blank" rel="noopener noreferrer" aria-label={`${contact.label}, abrir WhatsApp`} onClick={() => setPlacement(null)}>
          <span className="portal-whatsapp-option-icon" aria-hidden="true">{icon}</span>
          <span><strong>{contact.label}</strong><small>{contact.description}</small></span>
        </PortalWhatsappLink>)}</div>
        <Link className="portal-whatsapp-directory" href="/escorts" prefetch={false} onClick={() => setPlacement(null)}>Explorar anuncios de escorts y arriendos</Link>
      </section>
    </div>, document.body)}
  </WhatsappMenuContext.Provider>;
}
