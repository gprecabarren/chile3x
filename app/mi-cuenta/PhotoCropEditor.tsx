"use client";

import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload-policy";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { defaultPhotoCrop, movePhotoCrop, resizePhotoCrop, photoCropBounds, type PhotoCrop, type CropCorner } from "@/lib/photo-crop";
import { blobFromCanvas } from "./watermark-image";

export default function PhotoCropEditor({ file, onApply, disabled, onBusyChange }: { file: File; onApply: (file: File) => void; disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ pointerId: number; x: number; y: number; crop: PhotoCrop; corner?: CropCorner; scaleX: number; scaleY: number } | null>(null);
  const [crop, setCrop] = useState<PhotoCrop>({ ...defaultPhotoCrop });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [sourceSize, setSourceSize] = useState({ width: 1, height: 1 });
  useEffect(() => {
    const url = URL.createObjectURL(file), source = new window.Image();
    source.onload = () => { sourceRef.current = source; setSourceSize({ width: source.naturalWidth, height: source.naturalHeight }); setLoaded(true); };
    source.onerror = () => setError("No se pudo abrir la foto. El original no se modificó.");
    source.src = url;
    return () => { source.onload = null; source.onerror = null; sourceRef.current = null; URL.revokeObjectURL(url); };
  }, [file]);
  useEffect(() => {
    const source = sourceRef.current, canvas = canvasRef.current;
    if (!loaded || !source || !canvas) return;
    const bounds = photoCropBounds(source.naturalWidth, source.naturalHeight, crop);
    const scale = Math.min(1, 720 / Math.max(source.naturalWidth, source.naturalHeight));
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    setDimensions(`${bounds.outputWidth} × ${bounds.outputHeight} px`);
  }, [crop, loaded]);
  function startGesture(event: PointerEvent<HTMLDivElement>) {
    if (!loaded || disabled || saving || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (!target.closest(".photo-crop-selection")) return;
    const rectangle = event.currentTarget.getBoundingClientRect();
    const corner = target.closest<HTMLElement>("[data-crop-corner]")?.dataset.cropCorner as CropCorner | undefined;
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, crop, corner, scaleX: sourceSize.width / rectangle.width, scaleY: sourceSize.height / rectangle.height };
    event.currentTarget.setPointerCapture(event.pointerId); event.preventDefault();
  }
  function moveGesture(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId || disabled || saving) return;
    const dx = (event.clientX - active.x) * active.scaleX, dy = (event.clientY - active.y) * active.scaleY;
    setCrop(active.corner ? resizePhotoCrop(sourceSize.width, sourceSize.height, active.crop, active.corner, dx, dy) : movePhotoCrop(sourceSize.width, sourceSize.height, active.crop, dx, dy));
  }
  function endGesture(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const selection = loaded ? photoCropBounds(sourceSize.width, sourceSize.height, crop) : null;
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
      const blob = await blobFromCanvas(canvas, MAX_IMAGE_UPLOAD_BYTES);
      onApply(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-editada.jpg`, { type: "image/jpeg" }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo editar la foto."); }
    finally { setSaving(false); onBusyChange(false); }
  }
  return <section className="photo-crop-editor" aria-label="Editor de recorte">
    <p>Arrastra el cuadro para mover el recorte y sus esquinas para cambiar el tamaño, con el dedo o el mouse. Solo se conservará la zona dentro del cuadro. El original sigue disponible.</p>
    <div ref={stageRef} className="photo-crop-stage" style={{ aspectRatio: `${sourceSize.width} / ${sourceSize.height}`, width: `min(100%, ${Math.round(480 * sourceSize.width / sourceSize.height)}px)` }} onPointerDown={startGesture} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={() => { gesture.current = null; }}>
      <canvas ref={canvasRef} aria-label="Foto original con el cuadro de recorte" />
      {selection && <div className="photo-crop-selection" style={{ left: `${selection.x / sourceSize.width * 100}%`, top: `${selection.y / sourceSize.height * 100}%`, width: `${selection.width / sourceSize.width * 100}%`, height: `${selection.height / sourceSize.height * 100}%` }}>
        <span className="photo-crop-grid" aria-hidden="true" />
        {(["nw", "ne", "sw", "se"] as const).map(corner => <button key={corner} className={`photo-crop-handle is-${corner}`} data-crop-corner={corner} type="button" disabled={disabled || saving} aria-label={`Ajustar esquina ${corner === "nw" ? "superior izquierda" : corner === "ne" ? "superior derecha" : corner === "sw" ? "inferior izquierda" : "inferior derecha"}`} onKeyDown={event => { const dx = event.key === "ArrowLeft" ? -10 : event.key === "ArrowRight" ? 10 : 0, dy = event.key === "ArrowUp" ? -10 : event.key === "ArrowDown" ? 10 : 0; if (dx || dy) { event.preventDefault(); setCrop(current => resizePhotoCrop(sourceSize.width, sourceSize.height, current, corner, dx, dy)); } }} />)}
      </div>}
    </div>
    <div className="photo-crop-controls">
      <label>Formato<select value={crop.ratio} disabled={disabled || saving} onChange={event => setCrop(current => ({ ...current, ratio: event.target.value as PhotoCrop["ratio"] }))}><option value="original">Original</option><option value="square">Cuadrado</option><option value="portrait">Vertical 4:5</option><option value="landscape">Horizontal 16:9</option></select></label>
    </div>
    <details className="photo-crop-advanced"><summary>Ajustes avanzados · tamaño y posición</summary><div className="photo-crop-controls">
      <label>Tamaño máximo<select value={crop.maxDimension} disabled={disabled || saving} onChange={event => setCrop(current => ({ ...current, maxDimension: Number(event.target.value) }))}>{[2200,1600,1200,900,640].map(size => <option value={size} key={size}>{size} px · sin ampliar</option>)}</select></label>
      {([['zoom','Acercar encuadre',1,4,.1],['horizontal','Posición horizontal',0,100,1],['vertical','Posición vertical',0,100,1]] as const).map(([key,label,min,max,step]) => <label key={key}>{label}<input type="range" min={min} max={max} step={step} value={crop[key]} disabled={disabled || saving} onChange={event => setCrop(current => ({ ...current, [key]: Number(event.target.value) }))} /></label>)}
    </div></details>
    <small>{dimensions || "Cargando foto…"}</small>{error && <p role="alert">{error}</p>}
    <div className="photo-selection-actions"><button type="button" className="button button-outline" disabled={disabled || saving} onClick={() => setCrop({ ...defaultPhotoCrop })}>Restablecer encuadre</button><button type="button" className="button button-primary" disabled={!loaded || disabled || saving} onClick={apply}>{saving ? "Aplicando…" : "Usar este recorte"}</button></div>
  </section>;
}
