"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { prepareGalleryImage } from "./watermark-image";
import { FacePrivacyEditor } from "./FacePrivacyEditor";
import type { FacePrivacyRegion } from "@/lib/face-privacy";
import { SelectedPhotoPreview } from "./SelectedPhotoPreview";

type MediaItem = { id: string; url: string; mediaType: "image" | "video"; contentType: string; moderationStatus: "pending" | "approved" | "rejected"; visibility: "public" | "exclusive"; isProfilePhoto: boolean; byteSize: number };
type Quota = { bytes: number; level: "ok" | "warning" | "blocked"; message: string };
type Candidate = { id: string; file: File; originalFile: File; prepared?: File; image: boolean; blurFaces: boolean; watermark: boolean; faceRegions: FacePrivacyRegion[]; status: "ready" | "processing" | "uploading" | "completed" | "failed"; detail: string };
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

export function ProfileMediaManager({ profileId, initialMedia, initialQuota, mediaSettings, adminMode = false }: { profileId: string; initialMedia: MediaItem[]; initialQuota: Quota; mediaSettings: MediaSettings; adminMode?: boolean }) {
  const [media, setMedia] = useState(initialMedia); const [quota, setQuota] = useState(initialQuota);
  const mediaApi = adminMode ? `/api/admin/profiles/${profileId}/media` : `/api/perfiles/${profileId}/media`;
  const [notice, setNotice] = useState(""); const [isBusy, setIsBusy] = useState(false); const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [photoWatermark, setPhotoWatermark] = useState(false); const [photoBlurFaces, setPhotoBlurFaces] = useState(false);
  const [qualityWarning, setQualityWarning] = useState("");
  const [stagedPhoto, setStagedPhoto] = useState<File | null>(null);
  const [originalPhoto, setOriginalPhoto] = useState<File | null>(null);
  const [preparedPhoto, setPreparedPhoto] = useState<File | undefined>();
  const [photoRegions, setPhotoRegions] = useState<FacePrivacyRegion[]>([]);
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
    const applyWatermark = candidate?.watermark ?? photoWatermark;
    const blurFaces = candidate?.blurFaces ?? photoBlurFaces;
    const cached = candidate?.prepared ?? (uploadKind === "profile_photo" ? preparedPhoto : undefined);
    if (image && cached) prepared = cached;
    else if (image) {
      const result = await prepareGalleryImage(file, {
        maxBytes: 4_900_000, maxDimension: 2200, applyWatermark, blurFaces,
        faceRegions: candidate?.faceRegions ?? photoRegions,
        onProgress: (detail) => { if (candidate) updateCandidate(candidate.id, { status: "processing", detail }); },
      });
      prepared = result.file;
      if (result.qualityWarning) setQualityWarning(result.qualityWarning);
    }
    if (candidate) updateCandidate(candidate.id, { status: "uploading", detail: adminMode ? "Subiendo y aprobando…" : "Subiendo a revisión…" });
    const data = new FormData(); data.set("file", prepared); data.set("upload_kind", uploadKind);
    const response = await fetch(mediaApi, { method: "POST", body: data });
    const payload = await response.json() as { error?: string; media?: MediaItem; quota?: Quota };
    if (!response.ok || !payload.media || !payload.quota) throw new Error(payload.error ?? "No se pudo subir el archivo.");
    setMedia((current) => [...(uploadKind === "profile_photo" && payload.media!.moderationStatus === "approved" ? current.map((item) => item.isProfilePhoto && item.moderationStatus === "approved" ? { ...item, isProfilePhoto: false } : item) : current), payload.media!]); setQuota(payload.quota);
    if (candidate) updateCandidate(candidate.id, { status: "completed", detail: adminMode ? "Aprobado." : "Enviada a revisión." });
  }

  async function uploadProfilePhoto(files: FileList | null) {
    const file = files?.[0]; if (!file || isBusy) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5_000_000) { setNotice("Elige una foto JPEG, PNG o WebP de hasta 5 MB."); if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = ""; return; }
    setStagedPhoto(file); setOriginalPhoto(file); setPreparedPhoto(undefined); setPhotoRegions([]); setQualityWarning("");
    setNotice("Foto principal seleccionada. Revisa el resultado y pulsa el botón de enviar; aún no se ha subido.");
    if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
  }

  async function uploadStagedPhoto() {
    if (!stagedPhoto || isBusy) return;
    setIsBusy(true); setNotice("");
    try { await uploadOne(stagedPhoto, "profile_photo"); setStagedPhoto(null); setOriginalPhoto(null); setPreparedPhoto(undefined); setPhotoRegions([]); setNotice(adminMode ? "Foto principal procesada y aprobada." : "Foto principal enviada a revisión. La foto vigente se conserva hasta aprobar el reemplazo."); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo procesar la foto."); }
    finally { setIsBusy(false); }
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
      selected.push({ id: candidateId(file, index), file, originalFile: file, image, blurFaces: false, watermark: !adminMode && mediaSettings.watermarkEnabled, faceRegions: [], status: "ready", detail: image ? "Lista para procesar." : "Video sin modificaciones." });
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
      setNotice(adminMode ? "Los archivos válidos quedaron aprobados. Si alguno falló, revisa su estado arriba. El anuncio debe estar publicado para mostrarlos." : "El material se envió a revisión con las opciones elegidas en cada foto. Los videos no se modifican.");
    } finally { setIsBusy(false); }
  }

  async function remove(mediaId: string) {
    if (isBusy) return; setIsBusy(true); setNotice("");
    try {
      const response = await fetch(`${mediaApi}/${mediaId}`, { method: "DELETE" }); const payload = await response.json() as { error?: string; quota?: Quota };
      if (!response.ok || !payload.quota) throw new Error(payload.error ?? "No se pudo eliminar el archivo.");
      setMedia((current) => current.filter((item) => item.id !== mediaId)); setQuota(payload.quota); setNotice("El archivo se eliminó del almacenamiento privado.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo eliminar el archivo."); } finally { setIsBusy(false); }
  }

  const profilePhotos = media.filter((item) => item.isProfilePhoto); const galleryMedia = media.filter((item) => !item.isProfilePhoto && item.visibility === "public");
  const images = galleryMedia.filter((item) => item.mediaType === "image"); const videos = galleryMedia.filter((item) => item.mediaType === "video");
  const canChoose = !isBusy && quota.level !== "blocked" && (images.length < 10 || videos.length < 3); const pendingCandidates = candidates.filter((candidate) => candidate.status !== "completed");

  return <section className="profile-media-manager" id="fotos-y-videos" tabIndex={-1}>
    <div className="profile-media-manager-heading"><div><p className="eyebrow">MEDIOS DEL ANUNCIO</p><h2>Fotos y videos</h2><span>{adminMode ? "Puedes subir foto principal y galería para esta cuenta. Los archivos que cargues como administrador se aprueban inmediatamente; los que suba la persona usuaria mantienen su revisión habitual." : "Separa tu foto principal de la galería pública. Todo material llega primero a revisión. El contenido exclusivo se administra desde la sección Contenido de tu cuenta."}</span></div><strong>{images.length}/10 fotos<br />{videos.length}/3 videos</strong></div>
    <p className={`media-quota media-quota-${quota.level}`}><b>Uso de R2: {formatBytes(quota.bytes)}</b>{quota.message}</p>{notice && <p className="media-manager-notice" role="status">{notice}</p>}
    {qualityWarning && <p className="photo-quality-warning" role="status">{qualityWarning}</p>}
    <div className="profile-photo-manager"><div><p className="eyebrow">FOTO PRINCIPAL</p><h3>Foto de perfil</h3><span>Es la imagen prioritaria en el directorio y al abrir el aviso. Puedes recortarla y añadir una marca de agua grande, centrada y sin colores. Sube el archivo original para mantener su calidad.</span><div className="admin-photo-processing-options"><label><input type="checkbox" checked={photoWatermark} disabled={isBusy} onChange={event => { setPhotoWatermark(event.target.checked); setPreparedPhoto(undefined); }} />Marca de agua centrada</label>{(adminMode || mediaSettings.faceBlurEnabled) && <label><input type="checkbox" checked={photoBlurFaces} disabled={isBusy} onChange={event => { setPhotoBlurFaces(event.target.checked); setPreparedPhoto(undefined); }} />Difuminar rostros</label>}</div></div><label className="button button-outline">{isBusy ? "Procesando…" : "Elegir foto de perfil"}<input aria-label="Elegir foto de perfil" ref={profilePhotoInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={isBusy || quota.level === "blocked"} onChange={event => uploadProfilePhoto(event.target.files)} /></label></div>
    {stagedPhoto && <section className="staged-profile-photo"><strong className="selected-photo-filename">{originalPhoto?.name ?? stagedPhoto.name}</strong>
      <SelectedPhotoPreview file={stagedPhoto} watermark={photoWatermark} blurFaces={photoBlurFaces} regions={photoRegions} disabled={isBusy} prepared={preparedPhoto} onBusyChange={setIsBusy} edited={stagedPhoto !== originalPhoto} onPrepared={result => { setPreparedPhoto(result.file); setQualityWarning(result.qualityWarning); }} onEdit={file => { setStagedPhoto(file); setPreparedPhoto(undefined); setPhotoRegions([]); }} onRestore={() => { setStagedPhoto(originalPhoto); setPreparedPhoto(undefined); setPhotoRegions([]); }} />
      {photoBlurFaces && <FacePrivacyEditor file={stagedPhoto} regions={photoRegions} onChange={regions => { setPhotoRegions(regions); setPreparedPhoto(undefined); }} disabled={isBusy} />}
      <div className="face-privacy-actions"><button type="button" className="button button-primary" disabled={isBusy} onClick={uploadStagedPhoto}>{isBusy ? "Procesando…" : adminMode ? "Procesar y aprobar foto principal" : "Enviar foto principal a revisión"}</button><button type="button" className="button button-outline" disabled={isBusy} onClick={() => { setStagedPhoto(null); setOriginalPhoto(null); setPreparedPhoto(undefined); setPhotoRegions([]); }}>Cancelar foto seleccionada</button></div></section>}
    {profilePhotos.length > 0 && <div className="profile-photo-preview-list">{profilePhotos.map(item => <article key={item.id}><div className="media-owner-preview"><a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir foto principal completa"><Image src={item.url} alt="Vista previa completa de foto de perfil" fill unoptimized sizes="210px" /></a></div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>Foto principal · {formatBytes(item.byteSize)}</small><a className="media-owner-open" href={item.url} target="_blank" rel="noopener noreferrer">Ver foto completa</a><button type="button" onClick={() => remove(item.id)} disabled={isBusy}>Eliminar</button></div></article>)}</div>}
    <section className="profile-public-gallery-manager"><div><p className="eyebrow">GALERÍA PÚBLICA</p><h3>Fotos y videos del anuncio</h3><p>{adminMode ? "Marca de agua y difuminado son opcionales e independientes en cada foto. Los videos no se procesan." : <>Puedes activar o desactivar una marca de agua grande, centrada y sin colores en cada foto. {mediaSettings.faceBlurEnabled ? "Puedes decidir por cada foto si quieres difuminar rostros antes de enviarla." : "El difuminado facial está desactivado temporalmente por el equipo."}</>}</p></div><label className="button button-primary">{isBusy ? "Procesando…" : "Elegir archivos"}<input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple disabled={!canChoose} onChange={(event) => chooseGallery(event.target.files)} /></label><small>Fotos JPEG, PNG o WebP: hasta 5 MB. Videos MP4 o WebM: hasta 8 MB y 10 segundos.</small>
      {pendingCandidates.length > 0 && <div className="gallery-upload-candidates"><div><strong>Archivos seleccionados</strong><span>Conservamos el nombre original. Abre cada foto o revisa el resultado con sus opciones antes de subirla.</span></div>{pendingCandidates.map(candidate => <article key={candidate.id}>
        <div><strong title={candidate.originalFile.name}>{candidate.originalFile.name}</strong><small>{candidate.image ? "Foto" : "Video"} · {formatBytes(candidate.file.size)}</small></div>
        {candidate.image && <label className="gallery-face-blur-option"><input type="checkbox" checked={candidate.watermark} disabled={isBusy} onChange={event => updateCandidate(candidate.id, { watermark: event.target.checked, prepared: undefined, detail: "Lista para procesar." })} />Marca de agua centrada</label>}
        {candidate.image && (adminMode || mediaSettings.faceBlurEnabled) && <label className="gallery-face-blur-option"><input type="checkbox" checked={candidate.blurFaces} disabled={isBusy} onChange={event => updateCandidate(candidate.id, { blurFaces: event.target.checked, prepared: undefined, detail: "Lista para procesar." })} />Difuminar rostros</label>}
        <span className={`gallery-upload-status is-${candidate.status}`} role="status">{candidate.detail}</span>
        {candidate.image && <SelectedPhotoPreview file={candidate.file} watermark={candidate.watermark} blurFaces={candidate.blurFaces} regions={candidate.faceRegions} disabled={isBusy} prepared={candidate.prepared} onBusyChange={setIsBusy} edited={candidate.file !== candidate.originalFile} onPrepared={result => { updateCandidate(candidate.id, { prepared: result.file, status: "ready", detail: "Vista previa lista para subir." }); setQualityWarning(result.qualityWarning); }} onEdit={file => updateCandidate(candidate.id, { file, prepared: undefined, faceRegions: [], status: "ready", detail: "Recorte aplicado. Revisa el resultado." })} onRestore={() => updateCandidate(candidate.id, { file: candidate.originalFile, prepared: undefined, faceRegions: [], status: "ready", detail: "Foto original restaurada." })} />}
        {candidate.image && candidate.blurFaces && <FacePrivacyEditor file={candidate.file} regions={candidate.faceRegions} disabled={isBusy} onChange={regions => updateCandidate(candidate.id, { faceRegions: regions, prepared: undefined, status: "ready", detail: regions.length ? "Zonas manuales listas para procesar." : "Se usará detección automática." })} />}
        <button type="button" className="gallery-candidate-remove" disabled={isBusy} onClick={() => setCandidates(current => current.filter(item => item.id !== candidate.id))}>Quitar</button>
      </article>)}<button className="button button-primary" type="button" disabled={isBusy} onClick={uploadCandidates}>{isBusy ? "Procesando archivos…" : adminMode ? "Procesar y aprobar archivos" : "Procesar y enviar a revisión"}</button></div>}
      {galleryMedia.length > 0 ? <div className="media-owner-grid">{galleryMedia.map((item, index) => <article key={item.id}><div className="media-owner-preview">{item.mediaType === "image" ? <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto ${index + 1} completa`}><Image src={item.url} alt={`Vista previa completa de foto ${index + 1}`} fill unoptimized sizes="(max-width: 620px) 80vw, 240px" /></a> : <video controls preload="metadata"><source src={item.url} type={item.contentType} /></video>}</div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>{item.mediaType === "video" ? "Video · " : "Foto · "}{formatBytes(item.byteSize)}</small>{item.mediaType === "image" && <a className="media-owner-open" href={item.url} target="_blank" rel="noopener noreferrer">Ver foto completa</a>}<button type="button" onClick={() => remove(item.id)} disabled={isBusy}>Eliminar</button></div></article>)}</div> : <p className="profile-media-empty">Aún no has agregado fotos o videos a la galería pública.</p>}
    </section>
  </section>;
}
