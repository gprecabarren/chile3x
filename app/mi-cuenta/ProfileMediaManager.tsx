"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { watermarkImage } from "./watermark-image";

type MediaItem = {
  id: string;
  url: string;
  mediaType: "image" | "video";
  contentType: string;
  moderationStatus: "pending" | "approved" | "rejected";
  visibility: "public" | "exclusive";
  isProfilePhoto: boolean;
  byteSize: number;
};

type Quota = { bytes: number; level: "ok" | "warning" | "blocked"; message: string };

const statusLabel = { pending: "En revisión", approved: "Publicada", rejected: "Rechazada" };

function formatBytes(bytes: number) {
  if (bytes < 1_000_000) return `${Math.round(bytes / 1_000)} KB`;
  if (bytes < 1_000_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
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
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const exclusiveInputRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null, uploadKind: "gallery" | "profile_photo" | "exclusive" = "gallery") {
    if (!files?.length || isBusy) return;
    setIsBusy(true);
    setNotice("");
    try {
      for (const originalFile of Array.from(files)) {
        const image = originalFile.type.startsWith("image/");
        const video = originalFile.type === "video/mp4" || originalFile.type === "video/webm";
        if (!image && !video) throw new Error("Elige imágenes JPEG, PNG o WebP, o videos MP4/WebM.");
        if (uploadKind === "profile_photo" && !image) throw new Error("La foto de perfil debe ser una imagen JPEG, PNG o WebP.");
        if (image && originalFile.size > 5_000_000) throw new Error("Cada imagen debe pesar 5 MB o menos.");
        if (video && originalFile.size > 8_000_000) throw new Error("Cada video debe pesar 8 MB o menos.");
        if (video) {
          const duration = await videoDuration(originalFile);
          if (!Number.isFinite(duration) || duration > 10.05) throw new Error("Los videos deben durar 10 segundos o menos.");
        }
        const file = image ? await watermarkImage(originalFile, { maxBytes: 4_900_000, maxDimension: 2200 }) : originalFile;
        const data = new FormData();
        data.set("file", file);
        data.set("upload_kind", uploadKind);
        const response = await fetch(`/api/perfiles/${profileId}/media`, { method: "POST", body: data });
        const payload = await response.json() as { error?: string; media?: MediaItem; quota?: Quota };
        if (!response.ok || !payload.media || !payload.quota) throw new Error(payload.error ?? "No se pudo subir el archivo.");
        setMedia((current) => [...current, payload.media!]);
        setQuota(payload.quota);
      }
      setNotice(uploadKind === "profile_photo" ? "La nueva foto de perfil quedó enviada a revisión. Lleva una marca Chile3X sutil y la foto vigente se mantiene hasta que el equipo apruebe el reemplazo." : "El material quedó enviado a revisión. Las fotos llevan una marca Chile3X sutil y nada será público hasta que lo apruebe el equipo.");
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "No se pudo subir el archivo.");
    } finally {
      if (galleryInputRef.current) galleryInputRef.current.value = "";
      if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
      if (exclusiveInputRef.current) exclusiveInputRef.current.value = "";
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

  const profilePhotos = media.filter((item) => item.isProfilePhoto);
  const galleryMedia = media.filter((item) => !item.isProfilePhoto && item.visibility === "public");
  const exclusiveMedia = media.filter((item) => !item.isProfilePhoto && item.visibility === "exclusive");
  const images = galleryMedia.filter((item) => item.mediaType === "image");
  const videos = galleryMedia.filter((item) => item.mediaType === "video");
  const canUpload = !isBusy && quota.level !== "blocked" && (images.length < 10 || videos.length < 3);

  return <section className="profile-media-manager">
    <div className="profile-media-manager-heading"><div><p className="eyebrow">GALERÍA PRIVADA</p><h2>Fotos y videos</h2><span>Las fotos se guardan con una marca Chile3X sutil. Puedes tener hasta 10 fotos y 3 videos de máximo 10 segundos; cada archivo se revisa antes de publicarse.</span></div><strong>{images.length}/10 fotos<br />{videos.length}/3 videos</strong></div>
    <p className={`media-quota media-quota-${quota.level}`}><b>Uso de R2: {formatBytes(quota.bytes)}</b>{quota.message}</p>
    {notice && <p className="media-manager-notice" role="status">{notice}</p>}
    <div className="profile-photo-manager"><div><p className="eyebrow">FOTO PRINCIPAL</p><h3>Foto de perfil</h3><span>Es la imagen prioritaria en el directorio y al abrir el aviso. Se revisa por separado de la galería.</span></div><label className="button button-outline">{isBusy ? "Procesando…" : "Cambiar foto de perfil"}<input ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={isBusy || quota.level === "blocked"} onChange={(event) => upload(event.target.files, "profile_photo")} /></label></div>
    {profilePhotos.length > 0 && <div className="profile-photo-preview-list">{profilePhotos.map((item) => <article key={item.id}><div className="media-owner-preview"><Image src={item.url} alt="Vista previa de foto de perfil" fill unoptimized sizes="120px" /></div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>Foto principal · {formatBytes(item.byteSize)}</small><button type="button" onClick={() => remove(item.id)} disabled={isBusy}>Eliminar</button></div></article>)}</div>}
    <div className="media-upload-row"><label className="button button-primary">{isBusy ? "Procesando…" : "Seleccionar fotos o videos"}<input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple disabled={!canUpload} onChange={(event) => upload(event.target.files)} /></label><small>Galería: fotos JPEG, PNG o WebP, hasta 5 MB. Videos MP4 o WebM, hasta 8 MB y 10 segundos.</small></div>
    {galleryMedia.length > 0 && <div className="media-owner-grid">{galleryMedia.map((item, index) => <article key={item.id}><div className="media-owner-preview">{item.mediaType === "image" ? <Image src={item.url} alt={`Vista previa de foto ${index + 1}`} fill unoptimized sizes="(max-width: 620px) 50vw, 180px" /> : <video controls preload="metadata"><source src={item.url} type={item.contentType} /></video>}</div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>{item.mediaType === "video" ? "Video · " : "Foto · "}{formatBytes(item.byteSize)}</small><button type="button" onClick={() => remove(item.id)} disabled={isBusy}>Eliminar</button></div></article>)}</div>}
    <section className="exclusive-media-owner"><div><p className="eyebrow">CONTENIDO EXCLUSIVO</p><h3>Galería privada para personas autorizadas</h3><p>Se muestra bloqueada y desenfocada al público. Solo el dueño, el equipo administrador y las cuentas que autorices podrán abrir los archivos aprobados.</p></div><label className="button button-outline">{isBusy ? "Procesando…" : "Agregar contenido exclusivo"}<input ref={exclusiveInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple disabled={!canUpload} onChange={(event) => upload(event.target.files, "exclusive")} /></label>
      {exclusiveMedia.length > 0 && <div className="media-owner-grid">{exclusiveMedia.map((item, index) => <article key={item.id}><div className="media-owner-preview">{item.mediaType === "image" ? <Image src={item.url} alt={`Vista previa exclusiva ${index + 1}`} fill unoptimized sizes="180px" /> : <video controls preload="metadata"><source src={item.url} type={item.contentType} /></video>}</div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>Exclusivo · {formatBytes(item.byteSize)}</small><button type="button" onClick={() => remove(item.id)} disabled={isBusy}>Eliminar</button></div></article>)}</div>}
    </section>
  </section>;
}
