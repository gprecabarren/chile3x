"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type MediaItem = {
  id: string;
  url: string;
  mediaType: "image" | "video";
  contentType: string;
  moderationStatus: "pending" | "approved" | "rejected";
  byteSize: number;
};

type Quota = { bytes: number; level: "ok" | "warning" | "blocked"; message: string };

const statusLabel = { pending: "En revisión", approved: "Publicada", rejected: "Rechazada" };

function formatBytes(bytes: number) {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo preparar la marca de agua."));
    image.src = url;
  });
}

async function watermarkImage(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const [source, logo] = await Promise.all([loadImage(sourceUrl), loadImage("/chile3x-logo-primary.jpeg")]);
    const scale = Math.min(1, 2200 / Math.max(source.naturalWidth, source.naturalHeight));
    const width = Math.max(1, Math.round(source.naturalWidth * scale));
    const height = Math.max(1, Math.round(source.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tu navegador no pudo preparar la imagen.");
    context.drawImage(source, 0, 0, width, height);
    const logoWidth = Math.min(width * 0.48, Math.max(120, logo.naturalWidth * scale));
    const logoHeight = logoWidth * (logo.naturalHeight / logo.naturalWidth);
    context.globalAlpha = 0.23;
    context.globalCompositeOperation = "screen";
    context.drawImage(logo, (width - logoWidth) / 2, (height - logoHeight) / 2, logoWidth, logoHeight);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) throw new Error("No se pudo generar la imagen con marca de agua.");
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-chile3x.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function videoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(source); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(source); reject(new Error("No se pudo leer la duración del video.")); };
    video.src = source;
  });
}

export function ProfileMediaManager({ profileId, initialMedia, initialQuota }: { profileId: string; initialMedia: MediaItem[]; initialQuota: Quota }) {
  const [media, setMedia] = useState(initialMedia);
  const [quota, setQuota] = useState(initialQuota);
  const [notice, setNotice] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length || isBusy) return;
    setIsBusy(true);
    setNotice("");
    try {
      for (const originalFile of Array.from(files)) {
        const image = originalFile.type.startsWith("image/");
        const video = originalFile.type === "video/mp4" || originalFile.type === "video/webm";
        if (!image && !video) throw new Error("Elige imágenes JPEG, PNG o WebP, o videos MP4/WebM.");
        if (video) {
          const duration = await videoDuration(originalFile);
          if (!Number.isFinite(duration) || duration > 10.05) throw new Error("Los videos deben durar 10 segundos o menos.");
        }
        const file = image ? await watermarkImage(originalFile) : originalFile;
        const data = new FormData();
        data.set("file", file);
        const response = await fetch(`/api/perfiles/${profileId}/media`, { method: "POST", body: data });
        const payload = await response.json() as { error?: string; media?: MediaItem; quota?: Quota };
        if (!response.ok || !payload.media || !payload.quota) throw new Error(payload.error ?? "No se pudo subir el archivo.");
        setMedia((current) => [...current, payload.media!]);
        setQuota(payload.quota);
      }
      setNotice("El material quedó enviado a revisión. Las fotos llevan una marca de agua Chile3X y nada será público hasta que lo apruebe el equipo.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "No se pudo subir el archivo.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
      setIsBusy(false);
    }
  }

  async function remove(mediaId: string) {
    if (isBusy) return;
    setIsBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/perfiles/${profileId}/media/${mediaId}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string; quota?: Quota };
      if (!response.ok || !payload.quota) throw new Error(payload.error ?? "No se pudo eliminar el archivo.");
      setMedia((current) => current.filter((item) => item.id !== mediaId));
      setQuota(payload.quota);
      setNotice("El archivo se eliminó del almacenamiento privado.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "No se pudo eliminar el archivo.");
    } finally {
      setIsBusy(false);
    }
  }

  const images = media.filter((item) => item.mediaType === "image");
  const videos = media.filter((item) => item.mediaType === "video");
  const canUpload = !isBusy && quota.level !== "blocked" && (images.length < 10 || videos.length < 3);

  return <section className="profile-media-manager">
    <div className="profile-media-manager-heading"><div><p className="eyebrow">GALERÍA PRIVADA</p><h2>Fotos y videos</h2><span>Hasta 10 fotos con marca de agua y 3 videos de máximo 10 segundos. Cada archivo se revisa antes de publicarse.</span></div><strong>{images.length}/10 fotos<br />{videos.length}/3 videos</strong></div>
    <p className={`media-quota media-quota-${quota.level}`}><b>Uso de R2: {formatBytes(quota.bytes)}</b>{quota.message}</p>
    {notice && <p className="media-manager-notice" role="status">{notice}</p>}
    <div className="media-upload-row"><label className="button button-primary">{isBusy ? "Procesando…" : "Seleccionar fotos o videos"}<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple disabled={!canUpload} onChange={(event) => upload(event.target.files)} /></label><small>Fotos: JPEG, PNG o WebP, hasta 5 MB (se convierten a JPEG con marca de agua). Videos: MP4 o WebM, hasta 8 MB y 10 segundos.</small></div>
    {media.length > 0 && <div className="media-owner-grid">{media.map((item, index) => <article key={item.id}><div className="media-owner-preview">{item.mediaType === "image" ? <Image src={item.url} alt={`Vista previa de foto ${index + 1}`} fill unoptimized sizes="(max-width: 620px) 50vw, 180px" /> : <video controls preload="metadata"><source src={item.url} type={item.contentType} /></video>}</div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>{item.mediaType === "video" ? "Video · " : "Foto · "}{formatBytes(item.byteSize)}</small><button type="button" onClick={() => remove(item.id)} disabled={isBusy}>Eliminar</button></div></article>)}</div>}
  </section>;
}
