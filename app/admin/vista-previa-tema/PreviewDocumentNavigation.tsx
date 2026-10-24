"use client";

import type { MouseEvent, ReactNode } from "react";

/** A private preview may use a different root stylesheet from the public
 * site. Exit through a fresh document, not a router snapshot retaining it. */
export function PreviewDocumentNavigation({ children }: { children: ReactNode }) {
  function navigate(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
    event.preventDefault();
    window.location.assign(url.href);
  }
  return <div onClickCapture={navigate}>{children}</div>;
}
