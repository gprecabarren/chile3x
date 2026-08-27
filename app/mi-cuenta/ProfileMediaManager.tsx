"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { prepareGalleryImage } from "./watermark-image";

type MediaItem = { id: string; url: string; mediaType: "image" | "video"; contentType: string; moderationStatus: "pending" | "approved" | "rejected"; visibility: "public" | "exclusive"; isProfilePhoto: boolean; byteSize: number };
type Quota = { bytes: number; level: "ok" | "warning" | "blocked"; message: string };
type Candidate = { id: string; file: File; image: boolean; blurFaces: boolean; status: "ready" | "processing" | "uploading" | "completed" | "failed"; detail: string };
type MediaSettings = { watermarkEnabled: boolean; faceBlurEnabled: boolean };

const statusLabel = { pending: "En revisión", approved: "Publicada", rejected: "Rechazada" };

function formatBytes(bytes: number) { return bytes < 1_000_000 ? `${Math.round(bytes / 1_000)} KB` : bytes < 1_000_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${(bytes / 1_000_000_000).toFixed(2)} GB`; }
function candidateId(file: File, index: number) { return `${file.name}-${file.size}-${file.lastModified}-${index}-${crypto.randomUUID()}`; }

function videoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const source = URL.createObjectURL(file); const video = document.createElement("video"); video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(source); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(source); reject(new Error("No se pudo leer la duración del video.")); };
    video.src = source;
  });
}

export function ProfileMediaManager({ profileId, initialMedia, initialQuota, mediaSettings }: { profileId: string; initialMedia: MediaItem[]; initialQuota: Quota; mediaSettings: MediaSettings }) {
  const [media, setMedia] = useState(initialMedia); const [quota, setQuota] = useState(initialQuota);
  const [notice, setNotice] = useState(""); const [isBusy, setIsBusy] = useState(false); const [candidates, setCandidates] = useState<Candidate[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null); const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const updateCandidate = (id: string, patch: Partial<Candidate>) => setCandidates((current) => current.map((candidate) => candidate.id === id ? { ...candidate, ...patch } : candidate));

  async function uploadOne(file: File, uploadKind: "gallery" | "profile_photo", candidate?: Candidate) {
    const image = file.type.startsWith("image/"); const video = file.type === "video/mp4" || file.type === "video/webm";
    if (!image && !video) throw new Error("Elige imágenes JPEG, PNG o WebP, o videos MP4/WebM.");
    if (uploadKind === "profile_photo" && !image) throw new Error("La foto de perfil debe ser una imagen JPEG, PNG o WebP.");
    if (image && file.size > 5_000_000) throw new Error("Cada imagen debe pesar 5 MB o menos.");
    if (video && file.size > 8_000_000) throw new Error("Cada video debe pesar 8 MB o menos.");
    if (video) { const duration = await videoDuration(file); if (!Number.isFinite(duration) || duration > 10.05) throw new Error("Los videos deben durar 10 segundos o menos."); }
    let prepared = file;
    if (uploadKind === "gallery" && image) {
      prepared = (await prepareGalleryImage(file, {
        maxBytes: 4_900_000, maxDimension: 2200, applyWatermark: mediaSettings.watermarkEnabled, blurFaces: candidate?.blurFaces ?? false,
        onProgress: (detail) => { if (candidate) updateCandidate(candidate.id, { status: "processing", detail }); },
      })).file;
    }
    if (candidate) updateCandidate(candidate.id, { status: "uploading", detail: "Subiendo a revisión…" });
    const data = new FormData(); data.set("file", prepared); data.set("upload_kind", uploadKind);
    const response = await fetch(`/api/perfiles/${profileId}/media`, { method: "POST", body: data });
    const payload = await response.json() as { error?: string; media?: MediaItem; quota?: Quota };
    if (!response.ok || !payload.media || !payload.quota) throw new Error(payload.error ?? "No se pudo subir el archivo.");
    setMedia((current) => [...current, payload.media!]); setQuota(payload.quota);
    if (candidate) updateCandidate(candidate.id, { status: "completed", detail: "Enviada a revisión." });
  }

  async function uploadProfilePhoto(files: FileList | null) {
    const file = files?.[0]; if (!file || isBusy) return; setIsBusy(true); setNotice("");
    try { await uploadOne(file, "profile_photo"); setNotice("La nueva foto de perfil quedó enviada a revisión. La foto vigente se mantiene hasta que el equipo apruebe el reemplazo."); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo subir el archivo."); }
    finally { if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = ""; setIsBusy(false); }
  }

  async function chooseGallery(files: FileList | null) {
    if (!files?.length || isBusy) return; setNotice("");
    const selected: Candidate[] = [];
    const currentImageCount = images.length + candidates.filter((candidate) => candidate.status !== "completed" && candidate.image).length;
    const currentVideoCount = videos.length + candidates.filter((candidate) => candidate.status !== "completed" && !candidate.image).length;
    let nextImageCount = currentImageCount; let nextVideoCount = currentVideoCount;
    for (const [index, file] of Array.from(files).entries()) {
      const image = file.type.startsWith("image/"); const video = file.type === "video/mp4" || file.type === "video/webm";
      if (!image && !video) { setNotice("Solo se agregaron imágenes JPEG, PNG o WebP, y videos MP4/WebM."); continue; }
      if (image && file.size > 5_000_000) { setNotice(`No se agregó ${file.name}: cada imagen debe pesar 5 MB o menos.`); continue; }
      if (video && file.size > 8_000_000) { setNotice(`No se agregó ${file.name}: cada video debe pesar 8 MB o menos.`); continue; }
      if (image && nextImageCount >= 10) { setNotice("Ya alcanzaste el máximo de 10 fotos de galería. Elimina una foto antes de agregar otra."); continue; }
      if (video && nextVideoCount >= 3) { setNotice("Ya alcanzaste el máximo de 3 videos de galería. Elimina un video antes de agregar otro."); continue; }
      selected.push({ id: candidateId(file, index), file, image, blurFaces: false, status: "ready", detail: image ? "Lista para procesar." : "Video sin modificaciones." });
      if (image) nextImageCount += 1; else nextVideoCount += 1;
    }
    setCandidates((current) => [...current.filter((candidate) => candidate.status !== "completed"), ...selected]);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }

  async function uploadCandidates() {
    const pending = candidates.filter((candidate) => candidate.status === "ready" || candidate.status === "failed"); if (!pending.length || isBusy) return;
    setIsBusy(true); setNotice("");
    try {
      for (const candidate of pending) {
        try { await uploadOne(candidate.file, "gallery", candidate); }
        catch (cause) { updateCandidate(candidate.id, { status: "failed", detail: cause instanceof Error ? cause.message : "No se pudo subir el archivo." }); }
      }
      setNotice("El material se envió a revisión. Las imágenes de la galería siguen los ajustes actuales del portal; la foto principal, videos, historias y contenido exclusivo no se modifican.");
    } finally { setIsBusy(false); }
  }

  async function remove(mediaId: string) {
    if (isBusy) return; setIsBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/perfiles/${profileId}/media/${mediaId}`, { method: "DELETE" }); const payload = await response.json() as { error?: string; quota?: Quota };
      if (!response.ok || !payload.quota) throw new Error(payload.error ?? "No se pudo eliminar el archivo.");
      setMedia((current) => current.filter((item) => item.id !== mediaId)); setQuota(payload.quota); setNotice("El archivo se eliminó del almacenamiento privado.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo eliminar el archivo."); } finally { setIsBusy(false); }
  }

  const profilePhotos = media.filter((item) => item.isProfilePhoto); const galleryMedia = media.filter((item) => !item.isProfilePhoto && item.visibility === "public");
  const images = galleryMedia.filter((item) => item.mediaType === "image"); const videos = galleryMedia.filter((item) => item.mediaType === "video");
  const canChoose = !isBusy && quota.level !== "blocked" && (images.length < 10 || videos.length < 3); const pendingCandidates = candidates.filter((candidate) => candidate.status !== "completed");

  return <section className="profile-media-manager">
    <div className="profile-media-manager-heading"><div><p className="eyebrow">MEDIOS DEL ANUNCIO</p><h2>Fotos y videos</h2><span>Separa tu foto principal de la galería pública. Todo material llega primero a revisión. El contenido exclusivo se administra desde la sección Contenido de tu cuenta.</span></div><strong>{images.length}/10 fotos<br />{videos.length}/3 videos</strong></div>
    <p className={`media-quota media-quota-${quota.level}`}><b>Uso de R2: {formatBytes(quota.bytes)}</b>{quota.message}</p>{notice && <p className="media-manager-notice" role="status">{notice}</p>}
    <div className="profile-photo-manager"><div><p className="eyebrow">FOTO PRINCIPAL</p><h3>Foto de perfil</h3><span>Es la imagen prioritaria en el directorio y al abrir el aviso. Se revisa por separado y no lleva marca de agua ni difuminado.</span></div><label className="button button-outline">{isBusy ? "Procesando…" : "Cambiar foto de perfil"}<input ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={isBusy || quota.level === "blocked"} onChange={(event) => uploadProfilePhoto(event.target.files)} /></label></div>
    {profilePhotos.length > 0 && <div className="profile-photo-preview-list">{profilePhotos.map((item) => <article key={item.id}><div className="media-owner-preview"><Image src={item.url} alt="Vista previa de foto de perfil" fill unoptimized sizes="120px" /></div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>Foto principal · {formatBytes(item.byteSize)}</small><button type="button" onClick={() => remove(item.id)} disabled={isBusy}>Eliminar</button></div></article>)}</div>}
    <section className="profile-public-gallery-manager"><div><p className="eyebrow">GALERÍA PÚBLICA</p><h3>Fotos y videos del anuncio</h3><p>Las fotos de esta galería {mediaSettings.watermarkEnabled ? "reciben una marca Chile3X sutil" : "se subirán sin marca de agua"}. {mediaSettings.faceBlurEnabled ? "Puedes decidir por cada foto si quieres difuminar rostros antes de enviarla." : "El difuminado facial está desactivado temporalmente por el equipo."}</p></div><label className="button button-primary">{isBusy ? "Procesando…" : "Elegir archivos"}<input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple disabled={!canChoose} onChange={(event) => chooseGallery(event.target.files)} /></label><small>Fotos JPEG, PNG o WebP: hasta 5 MB. Videos MP4 o WebM: hasta 8 MB y 10 segundos.</small>
      {pendingCandidates.length > 0 && <div className="gallery-upload-candidates" aria-live="polite"><div><strong>Archivos seleccionados</strong><span>Revisa cada foto antes de subirla.</span></div>{pendingCandidates.map((candidate) => <article key={candidate.id}><div><strong>{candidate.file.name}</strong><small>{candidate.image ? "Foto" : "Video"} · {formatBytes(candidate.file.size)}</small></div>{candidate.image && mediaSettings.faceBlurEnabled && <label className="gallery-face-blur-option"><input type="checkbox" checked={candidate.blurFaces} disabled={isBusy || candidate.status === "processing" || candidate.status === "uploading"} onChange={(event) => updateCandidate(candidate.id, { blurFaces: event.target.checked, detail: "Lista para procesar." })} />Difuminar rostros</label>}<span className={`gallery-upload-status is-${candidate.status}`}>{candidate.detail}</span><button type="button" className="gallery-candidate-remove" disabled={isBusy || candidate.status === "processing" || candidate.status === "uploading"} onClick={() => setCandidates((current) => current.filter((item) => item.id !== candidate.id))}>Quitar</button></article>)}<button className="button button-primary" type="button" disabled={isBusy} onClick={uploadCandidates}>{isBusy ? "Procesando archivos…" : "Procesar y enviar a revisión"}</button></div>}
      {galleryMedia.length > 0 ? <div className="media-owner-grid">{galleryMedia.map((item, index) => <article key={item.id}><div className="media-owner-preview">{item.mediaType === "image" ? <Image src={item.url} alt={`Vista previa de foto ${index + 1}`} fill unoptimized sizes="(max-width: 620px) 50vw, 180px" /> : <video controls preload="metadata"><source src={item.url} type={item.contentType} /></video>}</div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>{item.mediaType === "video" ? "Video · " : "Foto · "}{formatBytes(item.byteSize)}</small><button type="button" onClick={() => remove(item.id)} disabled={isBusy}>Eliminar</button></div></article>)}</div> : <p className="profile-media-empty">Aún no has agregado fotos o videos a la galería pública.</p>}
    </section>
  </section>;
}
