"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

export function AccountMobileNavigation({ children }: { children: ReactNode }) {
  const details = useRef<HTMLDetailsElement>(null);

  function closeAfterSelection(event: MouseEvent<HTMLElement>) {
    if (!(event.target instanceof Element) || !event.target.closest("a[href]")) return;
    details.current?.removeAttribute("open");
  }

  return <details className="account-mobile-navigation" ref={details} onClick={closeAfterSelection}>
    <summary>Secciones de mi cuenta</summary>
    {children}
  </details>;
}
