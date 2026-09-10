"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

export function AdminMobileNavigation({ children }: { children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);

  function closeAfterSelection(event: MouseEvent<HTMLElement>) {
    if (!(event.target instanceof Element) || !event.target.closest("a[href]")) return;
    details.current?.removeAttribute("open");
  }

  return <details className="admin-mobile-navigation" ref={details} onClick={closeAfterSelection}>
    <summary>Secciones de administración</summary>
    {children}
  </details>;
}
