"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { PublicWhatsappContact } from "@/lib/portal-whatsapp";
import { PortalWhatsappLink, recordPortalWhatsapp } from "./PortalWhatsappLink";

export function FloatingWhatsappMenu({ contacts, title, description, buttonLabel, children }: {
  contacts: PublicWhatsappContact[]; title: string; description: string; buttonLabel: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !widgetRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  if (!contacts.length) return null;
  return <div className="portal-whatsapp-widget" ref={widgetRef}>
    <button type="button" className="floating-whatsapp" ref={triggerRef}
      aria-label={buttonLabel} title={buttonLabel} aria-expanded={open} aria-controls={panelId} aria-haspopup="dialog"
      onClick={() => {
        if (!open) recordPortalWhatsapp("panel_open", "panel", "floating");
        setOpen(!open);
      }}>{children}</button>
    {open && <section className="portal-whatsapp-panel" id={panelId} role="dialog" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <header><div><span>EQUIPO CHILE3X</span><h2 id={titleId}>{title}</h2></div>
        <button type="button" className="portal-whatsapp-close" ref={closeRef} aria-label="Cerrar contactos de WhatsApp" onClick={() => { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); }}>×</button>
      </header>
      <p className="portal-whatsapp-explanation" id={descriptionId}>{description}</p>
      <div className="portal-whatsapp-options">{contacts.map(contact => <PortalWhatsappLink key={contact.id} placement="floating" contactId={contact.id}
        className="portal-whatsapp-option" href={contact.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
        <span className="portal-whatsapp-option-icon" aria-hidden="true">{children}</span>
        <span><strong>{contact.label}</strong><small>{contact.description}</small><em>Escribir por WhatsApp <span aria-hidden="true">↗</span></em></span>
      </PortalWhatsappLink>)}</div>
    </section>}
  </div>;
}
