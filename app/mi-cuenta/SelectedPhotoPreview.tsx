"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { FacePrivacyRegion } from "@/lib/face-privacy";
import { prepareGalleryImage, type GalleryImageTransformResult } from "./watermark-image";

const PhotoCropEditor = lazy(() => import("./PhotoCropEditor"));

export function SelectedPhotoPreview({ file, watermark, blurFaces, regions, disabled, prepared, onPrepared, onEdit, onRestore, edited, onBusyChange }: {
  file: File; watermark: boolean; blurFaces: boolean; regions: FacePrivacyRegion[]; disabled: boolean;
  prepared?: File; onPrepared: (result: GalleryImageTransformResult) => void; onEdit: (file: File) => void;
  onRestore: () => void; edited: boolean; onBusyChange: (busy: boolean) => void;
}) {
  const previewRef = useRef<HTMLImageElement>(null), linkRef = useRef<HTMLAnchorElement>(null);
  const [processing, setProcessing] = useState(false), [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  useEffect(() => {
    const url = URL.createObjectURL(prepared ?? file);
    if (previewRef.current) previewRef.current.src = url;
    if (linkRef.current) linkRef.current.href = url;
    return () => URL.revokeObjectURL(url);
  }, [file, prepared]);
  async function preview() {
    if (disabled || processing) return;
    setProcessing(true); onBusyChange(true); setNotice("");
    try {
      const result = await prepareGalleryImage(file, { maxBytes: 4_900_000, maxDimension: 2200, applyWatermark: watermark, blurFaces, faceRegions: regions, onProgress: setNotice });
      onPrepared(result); setNotice("Resultado listo. Se subirá exactamente esta foto.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo preparar la vista previa. No se subió ningún archivo."); }
    finally { setProcessing(false); onBusyChange(false); }
  }
  return <div className="selected-photo-preview">
    <a ref={linkRef} target="_blank" rel="noopener noreferrer" aria-label={prepared ? "Abrir foto con efectos aplicados" : "Abrir foto seleccionada sin efectos"}>
      {/* Local object URLs stay on this device; no optimizer or upload on selection. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={previewRef} alt={prepared ? "Resultado con las opciones aplicadas" : "Foto seleccionada, todavía sin procesar"} loading="lazy" />
      <span>{prepared ? "Ver resultado completo" : "Ver foto completa · sin efectos"}</span>
    </a>
    <div className="photo-selection-actions"><button type="button" className="button button-outline" disabled={disabled || processing} onClick={preview}>{processing ? "Preparando vista previa…" : "Ver resultado con opciones"}</button><button type="button" className="button button-outline" disabled={disabled || processing} aria-expanded={editorOpen} onClick={() => setEditorOpen(!editorOpen)}>{editorOpen ? "Cerrar editor" : "Recortar / ajustar foto"}</button>{edited && <button type="button" className="button button-outline" disabled={disabled || processing} onClick={() => { onRestore(); setEditorOpen(false); }}>Volver al original</button>}</div>
    {notice && <p role="status">{!prepared && !processing && notice === "Resultado listo. Se subirá exactamente esta foto." ? "Opciones modificadas. Genera otra vista previa para comprobar el resultado." : notice}</p>}
    {editorOpen && <Suspense fallback={<p role="status">Cargando editor…</p>}><PhotoCropEditor key={`${file.name}:${file.size}:${file.lastModified}`} file={file} disabled={disabled || processing} onBusyChange={onBusyChange} onApply={next => { onEdit(next); setEditorOpen(false); setNotice("Recorte aplicado. Revisa la marca de agua y el difuminado antes de subir."); }} /></Suspense>}
  </div>;
}
