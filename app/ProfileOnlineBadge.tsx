"use client";

import { useEffect, useRef, useState } from "react";
import { subscribePublicPresence } from "./public-presence-client";

export function ProfileOnlineBadge({ profileId, initialOnline, large = false,agencyManaged=false }: {agencyManaged?:boolean; profileId: string; initialOnline: boolean; large?: boolean }) {
  const [online, setOnline] = useState(initialOnline), marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = marker.current;
    if (!element) return;
    const target = element.closest(".public-profile-card") ?? element.parentElement;
    if (!target || typeof IntersectionObserver === "undefined") return subscribePublicPresence(profileId, setOnline);
    let unsubscribe: (() => void) | undefined;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      if (visible && !unsubscribe) unsubscribe = subscribePublicPresence(profileId, setOnline);
      else if (!visible && unsubscribe) { unsubscribe(); unsubscribe = undefined; }
    }, { rootMargin: "160px" });
    observer.observe(target);
    return () => { observer.disconnect(); unsubscribe?.(); };
  }, [profileId]);
  return <span ref={marker} className={`profile-online-badge${large ? " profile-online-badge-large" : ""}`} style={online ? undefined : { display: "none" }} aria-hidden={!online || undefined} title={agencyManaged?"Actividad reciente de la cuenta que gestiona la agencia; no confirma que la persona anunciante esté conectada ni disponible.":"Actividad reciente en Chile3X; no indica disponibilidad de atención."}><i aria-hidden="true" />{agencyManaged?"Agencia en línea":"En línea"}</span>;
}
