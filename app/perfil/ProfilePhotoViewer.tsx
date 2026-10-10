"use client";

import Image from "next/image";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";

type Photo = { id: string; url: string; alt: string };
const PhotoContext = createContext<((id: string) => boolean) | null>(null);

export function ProfilePhotoLink({ mediaId, children, ...props }: Omit<ComponentProps<"a">, "href" | "target"> & { mediaId: string; href: string; children: ReactNode }) {
  const open = useContext(PhotoContext);
  return <a {...props} aria-haspopup="dialog" onClick={event => {
    props.onClick?.(event);
    if (!event.defaultPrevented && event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && open?.(mediaId)) event.preventDefault();
  }}>{children}</a>;
}

export function ProfilePhotoViewer({ photos, children }: { photos: Photo[]; children: ReactNode }) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const open = useCallback((id: string) => {
    const index = photos.findIndex(photo => photo.id === id);
    if (index < 0 || !dialogRef.current?.showModal) return false;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSelected(index); return true;
  }, [photos]);
  const isOpen = selected !== null;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    Object.assign(body.style, { position: "fixed", top: `-${scrollY}px`, width: "100%", overflow: "hidden" });
    dialog.showModal(); closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      Object.assign(body.style, previous);
      window.scrollTo({ top: scrollY, behavior: "instant" });
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);
  const photo = selected === null ? null : photos[selected];
  return <PhotoContext.Provider value={open}>{children}<dialog ref={dialogRef} className="profile-photo-dialog" aria-label="Fotografía completa" onCancel={event => { event.preventDefault(); setSelected(null); }} onClick={event => { if (event.target === event.currentTarget) setSelected(null); }} onKeyDown={event => {
    if (event.key === "ArrowRight") { event.preventDefault(); setSelected(index => index === null ? null : Math.min(photos.length - 1, index + 1)); }
    if (event.key === "ArrowLeft") { event.preventDefault(); setSelected(index => index === null ? null : Math.max(0, index - 1)); }
  }}>
    {photo && <div className="profile-photo-dialog-panel"><header><span>{selected! + 1} / {photos.length}</span><button ref={closeRef} type="button" className="profile-photo-close" aria-label="Cerrar fotografía" onClick={() => setSelected(null)}>×</button></header><div className="profile-photo-dialog-image"><Image key={photo.id} src={photo.url} alt={photo.alt} fill unoptimized sizes="100vw" style={{ objectFit: "scale-down" }} /></div>{photos.length > 1 && <nav aria-label="Fotografías del anuncio"><button type="button" disabled={selected === 0} onClick={() => setSelected(index => index === null ? null : index - 1)} aria-label="Foto anterior">← Anterior</button><button type="button" disabled={selected === photos.length - 1} onClick={() => setSelected(index => index === null ? null : index + 1)} aria-label="Foto siguiente">Siguiente →</button></nav>}</div>}
  </dialog></PhotoContext.Provider>;
}
