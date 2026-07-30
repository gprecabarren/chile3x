"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type MediaItem = {
  id: string;
  url: string;
  moderationStatus: "pending" | "approved" | "rejected";
  byteSize: number;
};

type Quota = {
  bytes: number;
  level: "ok" | "warning" | "blocked";
  message: string;
};

const statusLabel = {
  pending: "En revisión",
  approved: "Publicada",
  rejected: "Rechazada",
};

function formatBytes(bytes: number) {
  return bytes < 1_000_000 ? `${Math.round(bytes / 1_000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
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
      for (const file of Array.from(files)) {
        const data = new FormData();
        data.set("file", file);
        const response = await fetch(`/api/perfiles/${profileId}/media`, { method: "POST", body: data });
        const payload = await response.json() as { error?: string; media?: MediaItem; quota?: Quota };
        if (!response.ok || !payload.media || !payload.quota) throw new Error(payload.error ?? "No se pudo subir la imagen.");
        setMedia((current) => [...current, payload.media!]);
        setQuota(payload.quota);
      }
      setNotice("Las fotos quedaron enviadas a revisión. No serán públicas hasta que las apruebe el equipo.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "No se pudo subir la imagen.");
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
      if (!response.ok || !payload.quota) throw new Error(payload.error ?? "No se pudo eliminar la imagen.");
      setMedia((current) => current.filter((item) => item.id !== mediaId));
      setQuota(payload.quota);
      setNotice("La foto se eliminó del almacenamiento privado.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "No se pudo eliminar la imagen.");
    } finally {
      setIsBusy(false);
    }
  }

  const photosRemaining = Math.max(0, 10 - media.length);

  return <section className="profile-media-manager">
    <div className="profile-media-manager-heading"><div><p className="eyebrow">GALERÍA PRIVADA</p><h2>Fotos del perfil</h2><span>Hasta 10 imágenes JPEG, PNG o WebP. Máximo 5 MB por archivo y 25 MB por perfil.</span></div><strong>{media.length}/10</strong></div>
    <p className={`media-quota media-quota-${quota.level}`}><b>Uso de R2: {formatBytes(quota.bytes)}</b>{quota.message}</p>
    {notice && <p className="media-manager-notice" role="status">{notice}</p>}
    <div className="media-upload-row"><label className="button button-primary">{isBusy ? "Procesando…" : `Seleccionar fotos (${photosRemaining} disponibles)`}<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={isBusy || photosRemaining === 0 || quota.level === "blocked"} onChange={(event) => upload(event.target.files)} /></label><small>Las imágenes quedan privadas mientras estén en revisión. No se permiten videos en esta etapa.</small></div>
    {media.length > 0 && <div className="media-owner-grid">{media.map((item, index) => <article key={item.id}><div className="media-owner-preview"><Image src={item.url} alt={`Vista previa de foto ${index + 1}`} fill unoptimized sizes="(max-width: 620px) 50vw, 180px" /></div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>{formatBytes(item.byteSize)}</small><button type="button" onClick={() => remove(item.id)} disabled={isBusy}>Eliminar</button></div></article>)}</div>}
  </section>;
}
