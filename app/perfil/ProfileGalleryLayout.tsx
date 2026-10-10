"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

function GalleryViewIcon({ columns }: { columns: number }) {
  const gap = 2, cell = (18 - gap * (columns - 1)) / columns;
  return <svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
    {Array.from({ length: columns * columns }, (_, index) => <rect key={index} x={3 + (index % columns) * (cell + gap)} y={3 + Math.floor(index / columns) * (cell + gap)} width={cell} height={cell} rx=".8" />)}
  </svg>;
}

export function ProfileGalleryLayout({ count, kind, children }: { count: number; kind: "photos" | "videos"; children: ReactNode }) {
  const maximum = Math.min(3, Math.max(1, count));
  const [columns, setColumns] = useState(maximum);
  const current = Math.min(columns, maximum);
  return <div className="profile-gallery-layout" style={{ "--gallery-columns": current } as CSSProperties}>
    {maximum > 1 && <div className="profile-gallery-controls" role="group" aria-label={`Distribución de ${kind === "photos" ? "fotos" : "videos"}`}>
      <span>Vista</span>{Array.from({ length: maximum }, (_, index) => index + 1).map(value => <button key={value} type="button" title={`${value} ${value === 1 ? "columna" : "columnas"}`} aria-label={`${value} ${value === 1 ? "columna" : "columnas"}`} aria-pressed={current === value} onClick={() => setColumns(value)}><GalleryViewIcon columns={value} /></button>)}
    </div>}
    {children}
  </div>;
}
