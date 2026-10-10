"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const UnreadContext = createContext({ messages: 0, pendingReviews: 0 });
const POLL_MS = 45_000;

/** One aggregate poll per signed-in surface; no message bodies or identities. */
export function MessageNotifications({ initialUnread, initialPendingReviews = 0, children }: { initialUnread: number; initialPendingReviews?: number; children: ReactNode }) {
  const [unread, setUnread] = useState({ messages: initialUnread, pendingReviews: initialPendingReviews });
  const pathname = usePathname();
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    let refreshAgain = false;
    async function refresh() {
      if (document.visibilityState !== "visible" || controller.signal.aborted) return;
      if (inFlight) { refreshAgain = true; return; }
      inFlight = true;
      try {
        const response = await fetch("/api/mi-cuenta/avisos", { cache: "no-store", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) { setUnread({ messages: 0, pendingReviews: 0 }); return; }
        if (!response.ok) return;
        const data = await response.json() as { count?: number; pendingReviews?: number };
        if (!controller.signal.aborted && Number.isSafeInteger(data.count) && data.count! >= 0 && Number.isSafeInteger(data.pendingReviews) && data.pendingReviews! >= 0) setUnread({ messages: data.count!, pendingReviews: data.pendingReviews! });
      } catch { /* Keep the last confirmed count during a connection failure. */ }
      finally { inFlight = false; if (refreshAgain) { refreshAgain = false; void refresh(); } }
    }
    void refresh();
    const onChange = () => void refresh();
    const timer = window.setInterval(onChange, POLL_MS);
    window.addEventListener("focus", onChange);
    window.addEventListener("chile3x:messages-read", onChange);
    document.addEventListener("visibilitychange", onChange);
    return () => {
      controller.abort(); window.clearInterval(timer);
      window.removeEventListener("focus", onChange);
      window.removeEventListener("chile3x:messages-read", onChange);
      document.removeEventListener("visibilitychange", onChange);
    };
  }, [pathname]);
  return <UnreadContext.Provider value={unread}>{children}</UnreadContext.Provider>;
}

export function UnreadMessagesBadge({ reviews = false }: { reviews?: boolean }) {
  const counts = useContext(UnreadContext);
  const unread = reviews ? counts.pendingReviews : counts.messages;
  const label = reviews ? unread === 1 ? "comentario por revisar" : "comentarios por revisar" : unread === 1 ? "mensaje sin leer" : "mensajes sin leer";
  return unread > 0 ? <b aria-label={`${unread} ${label}`}>{unread > 99 ? "99+" : unread}</b> : null;
}

/** Shares the existing poll; dashboard cards never start another request loop. */
export function AccountNotificationCards() {
  const counts = useContext(UnreadContext);
  return <>
    <Link className="account-summary-card" href="/mi-cuenta/mensajes" prefetch={false}><span>Mensajes sin leer</span><strong>{counts.messages}</strong><small>{counts.messages ? "Abrir bandeja privada →" : "Tu bandeja está al día →"}</small></Link>
    <Link className="account-summary-card" href="/mi-cuenta/comentarios" prefetch={false}><span>Comentarios por revisar</span><strong>{counts.pendingReviews}</strong><small>{counts.pendingReviews ? "Aprobar o rechazar →" : "Ver tus comentarios →"}</small></Link>
  </>;
}

export function UnreadMessagesNotice({ variant = "account" }: { variant?: "account" | "public" }) {
  const unread = useContext(UnreadContext).messages;
  const pathname = usePathname();
  if (!unread || pathname === "/mi-cuenta/mensajes") return null;
  return <section className={`unread-messages-notice is-${variant}`} aria-label="Mensajes sin leer" aria-live="polite">
    <span className="unread-messages-icon" aria-hidden="true">✉</span>
    <div><strong>{unread === 1 ? "Tienes un mensaje sin leer" : `Tienes ${unread} mensajes sin leer`}</strong><small>Revisa tu bandeja privada de Chile3X.</small></div>
    <Link href="/mi-cuenta/mensajes" prefetch={false}>Ver mensajes <span aria-hidden="true">→</span></Link>
  </section>;
}

export function PendingReviewsNotice({ variant = "account" }: { variant?: "account" | "public" }) {
  const count = useContext(UnreadContext).pendingReviews;
  const pathname = usePathname();
  if (!count || pathname === "/mi-cuenta/comentarios") return null;
  return <section className={`unread-messages-notice is-${variant} is-reviews`} aria-label="Comentarios por revisar" aria-live="polite"><span className="unread-messages-icon" aria-hidden="true">◇</span><div><strong>{count === 1 ? "Tienes un comentario por revisar" : `Tienes ${count} comentarios por revisar`}</strong><small>Decide cuáles se publican en tus anuncios.</small></div><Link href="/mi-cuenta/comentarios" prefetch={false}>Revisar comentarios <span aria-hidden="true">→</span></Link></section>;
}
