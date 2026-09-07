"use client";

import { useEffect, useRef, useState } from "react";

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></svg>;
}

export function ProfileShareButton({ displayName, profileSlug }: { displayName: string; profileSlug: string }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const url = typeof window === "undefined" ? "" : new URL(`/perfil/${profileSlug}`, window.location.origin).toString();
  const text = `Mira el anuncio de ${displayName} en Chile3X`;

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);

  async function share() {
    setNotice("");
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName} | Chile3X`, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    setOpen((value) => !value);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Enlace copiado.");
      setOpen(false);
    } catch {
      setNotice("No se pudo copiar; mantén presionado el enlace del navegador.");
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  return <div className="profile-share" ref={rootRef}>
    <button className="profile-share-trigger" type="button" aria-expanded={open} aria-haspopup="menu" onClick={share}><ShareIcon />Compartir</button>
    {open && <div className="profile-share-menu" role="menu">
      <a role="menuitem" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}>WhatsApp</a>
      <a role="menuitem" target="_blank" rel="noreferrer" href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}>Telegram</a>
      <a role="menuitem" href={`mailto:?subject=${encodeURIComponent(`${displayName} en Chile3X`)}&body=${encodedText}%0A%0A${encodedUrl}`}>Correo</a>
      <button role="menuitem" type="button" onClick={copy}>Copiar enlace</button>
    </div>}
    {notice && <span className="profile-share-notice" role="status">{notice}</span>}
  </div>;
}
