"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { prepareGalleryImage } from "@/app/mi-cuenta/watermark-image";

export function AdminMediaImageProcessing({ mediaId, profileName }: { mediaId: string; profileName: string }) {
  const [watermark, setWatermark] = useState(false);
  const [blur, setBlur] = useState(false);
  const [preview, setPreview] = useState<{ file: File; url: string; facesBlurred: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  async function prepare() {
    if (!watermark && !blur) { setMessage("Elige marca de agua, difuminado o ambos."); return; }
    setBusy(true); setMessage(""); setPreview(null);
    try {
      const response = await fetch(`/media/${encodeURIComponent(mediaId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudo obtener la imagen original.");
      const blob = await response.blob();
      const source = new File([blob], `${mediaId}.${blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type });
      const result = await prepareGalleryImage(source, {
        maxBytes: 4_900_000, maxDimension: 2200, applyWatermark: watermark, blurFaces: blur,
        onProgress: setMessage,
      });
      if (result.file.size > 5_000_000) throw new Error("La imagen procesada supera el límite de 5 MB.");
      setPreview({ file: result.file, url: URL.createObjectURL(result.file), facesBlurred: result.facesBlurred });
      setMessage(blur && result.facesBlurred === 0 ? "No se detectaron rostros. Comprueba la vista previa antes de aplicar." : "Revisa la vista previa antes de reemplazar la imagen.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo preparar la imagen."); }
    finally { setBusy(false); }
  }

  async function apply() {
    if (!preview || busy) return;
    setBusy(true); setMessage("Guardando imagen procesada…");
    try {
      const data = new FormData(); data.set("file", preview.file); data.set("watermark", watermark ? "yes" : "no"); data.set("blur", blur ? "yes" : "no");
      const response = await fetch(`/api/admin/media/${encodeURIComponent(mediaId)}/procesar`, { method: "POST", body: data });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar la imagen.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar la imagen."); setBusy(false); }
  }

  return <details className="admin-media-processing">
    <summary>Marca de agua y difuminado</summary>
    <p>Procesa solo esta foto de {profileName}. La imagen original se reemplazará únicamente cuando confirmes la vista previa.</p>
    <div className="admin-media-processing-options">
      <label><input type="checkbox" checked={watermark} disabled={busy} onChange={(event) => { setWatermark(event.target.checked); setPreview(null); }} />Marca de agua Chile3X</label>
      <label><input type="checkbox" checked={blur} disabled={busy} onChange={(event) => { setBlur(event.target.checked); setPreview(null); }} />Difuminar rostros detectados</label>
    </div>
    <button type="button" className="button button-outline" disabled={busy || (!watermark && !blur)} onClick={prepare}>{busy ? "Procesando…" : "Generar vista previa"}</button>
    {preview && <div className="admin-media-processing-preview"><Image src={preview.url} alt={`Vista previa procesada de ${profileName}`} width={320} height={340} unoptimized /><small>{blur ? `${preview.facesBlurred} rostro${preview.facesBlurred === 1 ? "" : "s"} difuminado${preview.facesBlurred === 1 ? "" : "s"}. ` : ""}La confirmación reemplaza esta imagen, sin cambiar su estado de aprobación.</small><button type="button" className="button button-primary" disabled={busy} onClick={apply}>Confirmar y reemplazar imagen</button></div>}
    {message && <p role="status">{message}</p>}
  </details>;
}
