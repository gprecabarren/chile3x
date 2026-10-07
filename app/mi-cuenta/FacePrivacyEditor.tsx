"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { MAX_PRIVACY_REGIONS, type FacePrivacyRegion } from "@/lib/face-privacy";

export function FacePrivacyEditor({ file, regions, onChange, disabled = false }: {
  file: File; regions: FacePrivacyRegion[]; onChange: (regions: FacePrivacyRegion[]) => void; disabled?: boolean;
}) {
  const image = useRef<HTMLImageElement>(null);
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [draft, setDraft] = useState<FacePrivacyRegion | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (image.current) image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function point(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  }
  function update(index: number, field: keyof FacePrivacyRegion, percent: number) {
    const region = { ...regions[index], [field]: percent / 100 };
    region.x = Math.min(region.x, 1 - region.width); region.y = Math.min(region.y, 1 - region.height);
    onChange(regions.map((item, position) => position === index ? region : item));
  }
  return <details className="face-privacy-editor">
    <summary>Difuminado manual (opcional)</summary>
    <p>Marca las zonas que quieres ocultar arrastrando sobre la foto. En teclado, añade una zona y ajusta sus controles. Si marcas zonas, se usan en lugar de la detección automática.</p>
    <div className="face-privacy-image" onPointerDown={event => {
      if (disabled || regions.length >= MAX_PRIVACY_REGIONS || event.button !== 0) return;
      event.preventDefault(); start.current = { ...point(event), pointerId: event.pointerId }; event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={event => {
      const origin = start.current; if (!origin || origin.pointerId !== event.pointerId) return;
      const end = point(event); setDraft({ x: Math.min(origin.x, end.x), y: Math.min(origin.y, end.y), width: Math.abs(end.x - origin.x), height: Math.abs(end.y - origin.y) });
    }} onPointerUp={event => {
      const origin = start.current; if (!origin || origin.pointerId !== event.pointerId) return;
      const end = point(event); const region = { x: Math.min(origin.x, end.x), y: Math.min(origin.y, end.y), width: Math.abs(end.x - origin.x), height: Math.abs(end.y - origin.y) };
      if (!disabled && region.width >= .01 && region.height >= .01) onChange([...regions, region]);
      start.current = null; setDraft(null); event.currentTarget.releasePointerCapture(event.pointerId);
    }} onPointerCancel={() => { start.current = null; setDraft(null); }}>
      {/* Local object URL: deliberately neither uploaded nor sent to an image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={image} alt="Foto original para seleccionar zonas de privacidad, solo en este dispositivo" draggable={false} />
      {[...regions, ...(draft ? [draft] : [])].map((region, index) => <span key={index} style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.width * 100}%`, height: `${region.height * 100}%` }} aria-hidden="true">{index + 1}</span>)}
    </div>
    <div className="face-privacy-actions"><button type="button" className="button button-outline" disabled={disabled || regions.length >= MAX_PRIVACY_REGIONS} onClick={() => onChange([...regions, { x: .35, y: .1, width: .3, height: .25 }])}>Añadir zona</button><button type="button" className="button button-outline" disabled={disabled || !regions.length} onClick={() => onChange([])}>Limpiar zonas</button></div>
    {regions.map((region, index) => <fieldset className="face-privacy-controls" key={index}><legend>Zona {index + 1}</legend>
      {([['x', 'Horizontal'], ['y', 'Vertical'], ['width', 'Ancho'], ['height', 'Alto']] as const).map(([field, label]) => <label key={field}>{label}<input type="range" min={field === 'x' || field === 'y' ? 0 : 1} max={Math.round((field === 'x' ? 1 - region.width : field === 'y' ? 1 - region.height : 1) * 100)} value={Math.round(region[field] * 100)} disabled={disabled} onChange={event => update(index, field, Number(event.target.value))} /></label>)}
      <button type="button" disabled={disabled} className="button button-outline" onClick={() => onChange(regions.filter((_, position) => position !== index))}>Quitar zona {index + 1}</button>
    </fieldset>)}
    <small>Comprueba el resultado antes de guardar. El difuminado no garantiza anonimato: revisa también tatuajes, reflejos y otros detalles identificables.</small>
  </details>;
}
