"use client";

import { useEffect, useRef, useState } from "react";
import { defaultPhotoCrop, photoCropBounds, type PhotoCrop } from "@/lib/photo-crop";

export default function PhotoCropEditor({ file, onApply, disabled, onBusyChange }: { file: File; onApply: (file: File) => void; disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<PhotoCrop>({ ...defaultPhotoCrop });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dimensions, setDimensions] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(file), source = new window.Image();
    source.onload = () => { sourceRef.current = source; setLoaded(true); };
    source.onerror = () => setError("No se pudo abrir la foto. El original no se modificó.");
    source.src = url;
    return () => { source.onload = null; source.onerror = null; sourceRef.current = null; URL.revokeObjectURL(url); };
  }, [file]);
  useEffect(() => {
    const source = sourceRef.current, canvas = canvasRef.current;
    if (!loaded || !source || !canvas) return;
    const bounds = photoCropBounds(source.naturalWidth, source.naturalHeight, crop);
    const scale = Math.min(1, 720 / Math.max(bounds.outputWidth, bounds.outputHeight));
    canvas.width = Math.max(1, Math.round(bounds.outputWidth * scale)); canvas.height = Math.max(1, Math.round(bounds.outputHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, canvas.width, canvas.height);
    setDimensions(`${bounds.outputWidth} × ${bounds.outputHeight} px`);
  }, [crop, loaded]);
  async function apply() {
    const source = sourceRef.current;
    if (!source || disabled || saving) return;
    setSaving(true); onBusyChange(true); setError("");
    try {
      const bounds = photoCropBounds(source.naturalWidth, source.naturalHeight, crop);
      const canvas = document.createElement("canvas"); canvas.width = bounds.outputWidth; canvas.height = bounds.outputHeight;
      const context = canvas.getContext("2d"); if (!context) throw new Error("Tu navegador no pudo editar la foto.");
      context.imageSmoothingQuality = "high"; context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .94));
      if (!blob || blob.size > 5_000_000) throw new Error("La foto editada supera 5 MB. Reduce su tamaño; el original se conserva.");
      onApply(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-editada.jpg`, { type: "image/jpeg" }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo editar la foto."); }
    finally { setSaving(false); onBusyChange(false); }
  }
  return <section className="photo-crop-editor" aria-label="Editor de recorte">
    <p>Recorta y acerca el encuadre. La foto original se conserva hasta que decidas subirla. No aumentamos artificialmente su resolución.</p>
    <canvas ref={canvasRef} aria-label="Vista previa del recorte" />
    <div className="photo-crop-controls">
      <label>Formato<select value={crop.ratio} disabled={disabled || saving} onChange={event => setCrop(current => ({ ...current, ratio: event.target.value as PhotoCrop["ratio"] }))}><option value="original">Original</option><option value="square">Cuadrado</option><option value="portrait">Vertical 4:5</option><option value="landscape">Horizontal 16:9</option></select></label>
      <label>Tamaño máximo<select value={crop.maxDimension} disabled={disabled || saving} onChange={event => setCrop(current => ({ ...current, maxDimension: Number(event.target.value) }))}>{[2200,1600,1200,900,640].map(size => <option value={size} key={size}>{size} px · sin ampliar</option>)}</select></label>
      {([['zoom','Acercar encuadre',1,4,.1],['horizontal','Posición horizontal',0,100,1],['vertical','Posición vertical',0,100,1]] as const).map(([key,label,min,max,step]) => <label key={key}>{label}<input type="range" min={min} max={max} step={step} value={crop[key]} disabled={disabled || saving} onChange={event => setCrop(current => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}
    </div>
    <small>{dimensions || "Cargando foto…"}</small>{error && <p role="alert">{error}</p>}
    <div className="photo-selection-actions"><button type="button" className="button button-outline" disabled={disabled || saving} onClick={() => setCrop({ ...defaultPhotoCrop })}>Restablecer encuadre</button><button type="button" className="button button-primary" disabled={!loaded || disabled || saving} onClick={apply}>{saving ? "Aplicando…" : "Usar este recorte"}</button></div>
  </section>;
}
