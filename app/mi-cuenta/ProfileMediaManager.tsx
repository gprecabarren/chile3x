"use client";
import { ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";
import "./profile-media-manager.css";
import { useMediaFileDrop } from "./useMediaFileDrop";

import { MediaVideo } from "@/app/MediaVideo";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { prepareGalleryImage } from "./watermark-image";
import { FacePrivacyEditor } from "./FacePrivacyEditor";
import type { FacePrivacyRegion } from "@/lib/face-privacy";
import { SelectedPhotoPreview } from "./SelectedPhotoPreview";
import { SelectedVideoPreview } from "./SelectedVideoPreview";
import { VideoTrimEditor } from "./VideoTrimEditor";
import type { VideoTrim } from "@/lib/video-trim-policy";
import { isVideoSource, MAX_PREPARED_VIDEO_BYTES, VIDEO_INPUT_ACCEPT, VIDEO_UPLOAD_RULES } from "@/lib/video-policy";
import { uploadMediaRequest } from "@/lib/upload-response";
import { MAX_IMAGE_UPLOAD_BYTES, assertImageSource, IMAGE_INPUT_ACCEPT, IMAGE_UPLOAD_RULES, isImageSource } from "@/lib/image-upload-policy";
import { applyMediaOptionToSelection, type GalleryMediaOption } from "@/lib/gallery-media-options";
import { selectGalleryFiles } from "@/lib/media-file-selection";
import { applyGalleryOrder, moveGalleryOrder } from "@/lib/media-order";
import { deletePhotosSequentially, photoDeletionPlan } from "@/lib/profile-photo-batch";
import dynamic from "next/dynamic";
const AdminPhotoTools=dynamic(()=>import("@/app/admin/medios/AdminPhotoTools").then(module=>module.AdminPhotoTools));

type MediaItem = { id: string; url: string; mediaType: "image" | "video"; contentType: string; moderationStatus: "pending" | "approved" | "rejected"; visibility: "public" | "exclusive"; isProfilePhoto: boolean; byteSize: number; replacementOf?:string };
type Quota = { bytes: number; level: "ok" | "warning" | "blocked"; message: string };
type Candidate = { id: string; file: File; originalFile: File; prepared?: File; trim?: VideoTrim; image: boolean; blurFaces: boolean; watermark: boolean; faceRegions: FacePrivacyRegion[]; status: "ready" | "processing" | "uploading" | "completed" | "failed"; detail: string };
type MediaSettings = { watermarkEnabled: boolean; faceBlurEnabled: boolean };

const statusLabel = { pending: "En revisión", approved: "Publicada", rejected: "Rechazada" };

function formatBytes(bytes: number) { return bytes < 1_000_000 ? `${Math.round(bytes / 1_000)} KB` : bytes < 1_000_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${(bytes / 1_000_000_000).toFixed(2)} GB`; }
function candidateId(file: File, index: number) { return `${file.name}-${file.size}-${file.lastModified}-${index}-${crypto.randomUUID()}`; }

export function ProfileMediaManager({ profileId, initialMedia, initialQuota, mediaSettings, adminMode = false, initialRevision, sampleMode = false, moderationBulk, moderationActions }: { profileId: string; initialMedia: MediaItem[]; initialQuota: Quota; mediaSettings: MediaSettings; adminMode?: boolean;initialRevision?:number;sampleMode?:boolean; moderationBulk?:ReactNode; moderationActions?:Record<string,ReactNode> }) {
  const reviewKey = `${sampleMode ? "sample" : "profile"}:${profileId}`;
  const managerRoot=useRef<HTMLElement>(null),savedRevision=useRef<{id:string;revision:number}|null>(null);
  function reviewFields(){const data=new FormData();if(!adminMode&&initialRevision===undefined)return data;const scope=managerRoot.current?.closest<HTMLElement>('[data-review-resource]');data.set('review_key',reviewKey);data.set('review_revision',String(savedRevision.current?.id===profileId?savedRevision.current.revision:initialRevision??scope?.dataset.reviewRevision??''));if(adminMode)data.set('mutation_id',crypto.randomUUID());return data;}
  const [media, setMedia] = useState(initialMedia); const [quota, setQuota] = useState(initialQuota);
  const mediaApi = sampleMode ? `/api/admin/muestras/${profileId}/media` : adminMode ? `/api/admin/profiles/${profileId}/media` : `/api/perfiles/${profileId}/media`;
  useEffect(() => {
    const committed = (event: Event) => { const detail = (event as CustomEvent).detail; if (detail?.key === reviewKey && Number.isSafeInteger(detail.revision)) { const previous = savedRevision.current?.id === profileId ? savedRevision.current.revision : initialRevision; if (previous === detail.previousRevision) savedRevision.current = { id: profileId, revision: detail.revision }; } };
    window.addEventListener("chile3x:own-review-commit", committed);
    return () => window.removeEventListener("chile3x:own-review-commit", committed);
  }, [profileId, initialRevision, reviewKey]);
  const [notice, setNotice] = useState(""); const [isBusy, setIsBusy] = useState(false); const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [confirmDeletePhotos, setConfirmDeletePhotos] = useState(false), [deleteConfirmation, setDeleteConfirmation] = useState("");
  const deletePhotosTrigger = useRef<HTMLButtonElement>(null), deletePhotosInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (confirmDeletePhotos) deletePhotosInput.current?.focus({ preventScroll: true }); }, [confirmDeletePhotos]);
  const [photoWatermark, setPhotoWatermark] = useState(false); const [photoBlurFaces, setPhotoBlurFaces] = useState(false);
  const [qualityWarning, setQualityWarning] = useState("");
  const [stagedPhoto, setStagedPhoto] = useState<File | null>(null);
  const [originalPhoto, setOriginalPhoto] = useState<File | null>(null);
  const [preparedPhoto, setPreparedPhoto] = useState<File | undefined>();
  const [photoRegions, setPhotoRegions] = useState<FacePrivacyRegion[]>([]);
  const photoGalleryInputRef = useRef<HTMLInputElement>(null), videoGalleryInputRef = useRef<HTMLInputElement>(null); const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const videoAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => videoAbortRef.current?.abort(), []);
  const updateCandidate = (id: string, patch: Partial<Candidate>) => setCandidates((current) => current.map((candidate) => candidate.id === id ? { ...candidate, ...patch } : candidate));

  function applyToSelection(option: GalleryMediaOption, enabled: boolean, scope: "all" | "video" = "all") {
    if (isBusy) return;
    setCandidates(current => applyMediaOptionToSelection(current, option, enabled, scope));
    if (stagedPhoto && scope === "all") {
      if (option === "watermark") setPhotoWatermark(enabled); else setPhotoBlurFaces(enabled);
      setPreparedPhoto(undefined);
    }
  }

  async function prepareCandidateVideo(candidate: Candidate) {
    if (candidate.prepared) return candidate.prepared;
    const controller = new AbortController(); videoAbortRef.current = controller;
    updateCandidate(candidate.id, { status: "processing", detail: "Preparando video en este dispositivo…" });
    try {
      const { prepareVideo } = await import("./prepare-video");
      const result = await prepareVideo(candidate.originalFile, { watermark: candidate.watermark, trim: candidate.trim, signal: controller.signal, onProgress: detail => updateCandidate(candidate.id, { detail }) });
      updateCandidate(candidate.id, { file: result.file, prepared: result.file, status: "ready", detail: result.detail });
      return result.file;
    } finally { videoAbortRef.current = null; }
  }

  async function previewVideo(candidate: Candidate) {
    if (isBusy) return; setIsBusy(true);
    try { await prepareCandidateVideo(candidate); }
    catch (cause) { updateCandidate(candidate.id, { status: "failed", detail: cause instanceof Error ? cause.message : "No se pudo preparar el video." }); }
    finally { setIsBusy(false); }
  }

  async function uploadOne(file: File, uploadKind: "gallery" | "profile_photo", candidate?: Candidate) {
    const image = isImageSource(file); const video = !image && isVideoSource(file);
    if (!image && !video) throw new Error("Elige imágenes JPEG, PNG o WebP, o videos MP4/WebM/MOV.");
    if (uploadKind === "profile_photo" && !image) throw new Error("La foto de perfil debe ser una imagen JPEG, PNG o WebP.");
    if (image) assertImageSource(file.size);
    let prepared = file;
    if (video && candidate) prepared = await prepareCandidateVideo(candidate);
    const applyWatermark = candidate?.watermark ?? photoWatermark;
    const blurFaces = candidate?.blurFaces ?? photoBlurFaces;
    const cached = candidate?.prepared ?? (uploadKind === "profile_photo" ? preparedPhoto : undefined);
    if (image && cached) prepared = cached;
    else if (image) {
      const result = await prepareGalleryImage(file, {
        maxBytes: MAX_IMAGE_UPLOAD_BYTES, maxDimension: 2200, applyWatermark, blurFaces,
        faceRegions: candidate?.faceRegions ?? photoRegions,
        onProgress: (detail) => { if (candidate) updateCandidate(candidate.id, { status: "processing", detail }); },
      });
      prepared = result.file;
      if (result.qualityWarning) setQualityWarning(result.qualityWarning);
    }
    if (candidate) updateCandidate(candidate.id, { status: "uploading", detail: sampleMode ? "Guardando en la muestra privada…" : adminMode ? "Subiendo y aprobando…" : "Subiendo a revisión…" });
    const data = reviewFields(); data.set("file", prepared); data.set("upload_kind", uploadKind);
    if(image)data.set("processing",JSON.stringify({watermark:applyWatermark,blur:blurFaces,faceRegions:candidate?.faceRegions??photoRegions}));
    if(adminMode)data.set("mutation_id",crypto.randomUUID());
    const previousRevision=Number(data.get("review_revision"));
    const payload = await uploadMediaRequest<{ error?: string; media?: MediaItem; quota?: Quota;revision?:number }>(mediaApi, data);
    if (!payload.media || !payload.quota) throw new Error("El servidor no confirmó el archivo guardado. Revisa la galería antes de reintentar para evitar duplicados.");
    if(typeof payload.revision==='number')savedRevision.current={id:profileId,revision:payload.revision};
    if(adminMode&&typeof payload.revision==='number')window.dispatchEvent(new CustomEvent('chile3x:own-review-commit',{detail:{key:reviewKey,previousRevision,revision:payload.revision}}));
    setMedia((current) => [...(uploadKind === "profile_photo" && payload.media!.moderationStatus === "approved" ? current.map((item) => item.isProfilePhoto && item.moderationStatus === "approved" ? { ...item, isProfilePhoto: false } : item) : current), payload.media!]); setQuota(payload.quota);
    if (candidate) updateCandidate(candidate.id, { status: "completed", detail: sampleMode ? "Guardado en la muestra privada." : adminMode ? "Aprobado." : "Enviada a revisión." });
  }

  async function uploadProfilePhoto(files: FileList | readonly File[] | null) {
    const file = files?.[0]; if (!file || isBusy) return;
    if (quota.level === "blocked") { setNotice(quota.message); return; }
    if (files.length !== 1) { setNotice("Elige una sola foto de perfil. Agrega las demás en Fotos de la galería."); return; }
    try { if (!isImageSource(file)) throw new Error("Elige una foto JPEG, PNG, WebP o HEIC compatible."); assertImageSource(file.size); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo seleccionar la foto."); if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = ""; return; }
    setStagedPhoto(file); setOriginalPhoto(file); setPreparedPhoto(undefined); setPhotoRegions([]); setQualityWarning("");
    setNotice("Foto principal seleccionada. Revisa el resultado y pulsa el botón de enviar; aún no se ha subido.");
    if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = "";
  }

  async function uploadStagedPhoto() {
    if (!stagedPhoto || isBusy) return;
    setIsBusy(true); setNotice("");
    try { await uploadOne(stagedPhoto, "profile_photo"); setStagedPhoto(null); setOriginalPhoto(null); setPreparedPhoto(undefined); setPhotoRegions([]); setNotice(sampleMode ? "Foto principal guardada en la muestra privada." : adminMode ? "Foto principal procesada y aprobada." : "Foto principal enviada a revisión. La foto vigente se conserva hasta aprobar el reemplazo."); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo procesar la foto."); }
    finally { setIsBusy(false); }
  }

  async function chooseGallery(files: FileList | readonly File[] | null, kind?: "image" | "video") {
    if (!files?.length || isBusy) return; setNotice("");
    if (quota.level === "blocked") { setNotice(quota.message); return; }
    const selection = selectGalleryFiles(Array.from(files), {
      kind, imageLimit: 10, videoLimit: 3,
      imageCount: images.length + candidates.filter(candidate => candidate.status !== "completed" && candidate.image).length,
      videoCount: videos.length + candidates.filter(candidate => candidate.status !== "completed" && !candidate.image).length,
    });
    const selected: Candidate[] = selection.selected.map(({file, image}, index) => ({ id: candidateId(file, index), file, originalFile: file, image, blurFaces: false, watermark: !adminMode && mediaSettings.watermarkEnabled, faceRegions: [], status: "ready", detail: image ? "Lista para optimizar. El original aún no se subió." : "Pendiente de preparar. El original aún no se subió." }));
    setCandidates((current) => [...current.filter((candidate) => candidate.status !== "completed"), ...selected]);
    if (selection.errors.length) setNotice(`No se seleccionaron estos archivos:\n${selection.errors.join("\n")}`);
    if (photoGalleryInputRef.current) photoGalleryInputRef.current.value = "";
    if (videoGalleryInputRef.current) videoGalleryInputRef.current.value = "";
  }

  async function uploadCandidates(kind: "image" | "video") {
    const pending = candidates.filter((candidate) => candidate.image === (kind === "image") && (candidate.status === "ready" || candidate.status === "failed")); if (!pending.length || isBusy) return;
    setIsBusy(true); setNotice("");
    try {
      let failed = 0;
      for (const candidate of pending) {
        try { await uploadOne(candidate.file, "gallery", candidate); }
        catch (cause) { failed += 1; updateCandidate(candidate.id, { status: "failed", detail: cause instanceof Error ? cause.message : "No se pudo subir el archivo." }); }
      }
      setNotice(failed ? `${pending.length - failed} de ${pending.length} archivos enviados. Cada archivo restante muestra su causa. Si falló la respuesta, comprueba la galería antes de repetir.` : sampleMode ? "Los archivos quedaron guardados en la muestra privada. No requieren moderación ni se publican en el directorio." : adminMode ? "Los archivos quedaron aprobados. El anuncio debe estar publicado para mostrarlos." : "El material se envió a revisión. Solo se guardó la versión final de cada foto y video.");
    } finally { setIsBusy(false); }
  }

  async function deleteOne(mediaId: string, restoreOriginal = true) {
      const fields=adminMode||initialRevision!==undefined?reviewFields():undefined,previousRevision=Number(fields?.get("review_revision"));
      const response = await fetch(`${mediaApi}/${mediaId}`, { method: "DELETE",body:fields }); const payload = await response.json() as { error?: string; quota?: Quota;revision?:number;restoredMedia?:MediaItem };
      if (!response.ok || !payload.quota) throw new Error(payload.error ?? "No se pudo eliminar el archivo.");
      if(typeof payload.revision==='number'){
        savedRevision.current={id:profileId,revision:payload.revision};
        if(adminMode)window.dispatchEvent(new CustomEvent("chile3x:own-review-commit",{detail:{key:reviewKey,previousRevision,revision:payload.revision}}));
      }
      setMedia((current) => current.flatMap(item => item.id === mediaId ? (restoreOriginal && payload.restoredMedia ? [payload.restoredMedia] : []) : [item])); setQuota(payload.quota);
      return payload.restoredMedia;
  }

  async function remove(mediaId: string) {
    if (isBusy) return; setIsBusy(true); setNotice("");
    try {
      const restored=await deleteOne(mediaId);
      setNotice(restored ? "Se canceló la edición pendiente. La foto aprobada se conserva." : sampleMode ? "El archivo se retiró de la muestra privada." : "El archivo se eliminó del almacenamiento privado.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo eliminar el archivo."); } finally { setIsBusy(false); }
  }

  async function removeAllPhotos() {
    if (isBusy || deleteConfirmation !== "ELIMINAR") return;
    const { ids, count } = photoDeletionPlan(media);
    if (!ids.length) return;
    setIsBusy(true); setNotice("");
    try {
      const result = await deletePhotosSequentially(ids, async id => { await deleteOne(id, false); });
      if (result.failedId) {
        const reason = result.error instanceof Error ? result.error.message : "No se pudo confirmar la respuesta.";
        setNotice(`Se confirmó la eliminación de ${result.deleted.length} de ${ids.length} archivos de fotos. El proceso se detuvo: ${reason} Revisa la galería antes de volver a intentarlo.`);
      } else setNotice(`Se eliminaron ${count} fotos guardadas y sus versiones pendientes, incluida la principal si existía. Los videos se conservan.`);
      setConfirmDeletePhotos(false); setDeleteConfirmation("");
      managerRoot.current?.focus({ preventScroll: true });
    } finally { setIsBusy(false); }
  }

  async function updateSampleMedia(mediaId: string) {
    if (!sampleMode || isBusy) return;
    setIsBusy(true); setNotice("");
    try {
      const fields = reviewFields(), previousRevision = Number(fields.get("review_revision"));
      const response = await fetch(`${mediaApi}/${mediaId}`, { method: "PATCH", body: fields });
      const payload = await response.json() as { error?: string; revision?: number; quota?: Quota };
      if (!response.ok || !Number.isSafeInteger(payload.revision) || !payload.quota) throw new Error(payload.error ?? "No se pudo confirmar el cambio. Revisa la muestra antes de repetirlo.");
      savedRevision.current = { id: profileId, revision: payload.revision! };
      window.dispatchEvent(new CustomEvent("chile3x:own-review-commit", { detail: { key: reviewKey, previousRevision, revision: payload.revision } }));
      setMedia(current => current.map(item => ({ ...item, isProfilePhoto: item.id === mediaId })));
      setQuota(payload.quota); setNotice("Se guardó la foto principal de la muestra.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo confirmar el cambio. Revisa la muestra antes de repetirlo."); }
    finally { setIsBusy(false); }
  }

  async function moveMedia(mediaId: string, direction: -1 | 1) {
    if (isBusy) return;
    const moved = moveGalleryOrder(media, mediaId, direction);
    if (!moved) return;
    setIsBusy(true); setNotice("");
    try {
      const fields = reviewFields(), previousRevision = Number(fields.get("review_revision"));
      fields.set("kind", moved.kind); fields.set("order", JSON.stringify(moved.order));
      const response = await fetch(mediaApi, { method: "PATCH", body: fields }).catch(() => { throw new Error("La conexión se interrumpió. No se pudo confirmar el orden: recarga la galería antes de repetirlo."); });
      const payload = await response.json().catch(() => { throw new Error("El servidor no confirmó el orden. Recarga la galería antes de repetirlo."); }) as { error?: string; revision?: number };
      if (!response.ok || !Number.isSafeInteger(payload.revision)) throw new Error(payload.error ?? "No se pudo confirmar el orden. Recarga la galería antes de repetirlo.");
      savedRevision.current = { id: profileId, revision: payload.revision! };
      window.dispatchEvent(new CustomEvent("chile3x:own-review-commit", { detail: { key: reviewKey, previousRevision, revision: payload.revision } }));
      setMedia(current => applyGalleryOrder(current, moved.kind, moved.order));
      setNotice(`Orden de ${moved.kind === "image" ? "fotos" : "videos"} guardado. Así se mostrará en la galería.`);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo confirmar el orden. Recarga antes de repetirlo."); }
    finally { setIsBusy(false); }
  }

  const storedPhotos = media.filter(item => item.mediaType === "image" && item.visibility === "public");
  const profilePhotos = media.filter((item) => item.isProfilePhoto); const galleryMedia = media.filter((item) => !item.isProfilePhoto && item.visibility === "public");
  const images = galleryMedia.filter((item) => item.mediaType === "image"); const videos = galleryMedia.filter((item) => item.mediaType === "video");
  const pendingCandidates = candidates.filter((candidate) => candidate.status !== "completed");
  const selectedPhotos = pendingCandidates.filter(candidate => candidate.image);
  const selectedVideos = pendingCandidates.filter(candidate => !candidate.image);
  const selectedPhotoCount = selectedPhotos.length + (stagedPhoto ? 1 : 0);
  const selectedMediaCount = pendingCandidates.length + (stagedPhoto ? 1 : 0);
  const watermarkCount = pendingCandidates.filter(candidate => candidate.watermark).length + (stagedPhoto && photoWatermark ? 1 : 0);
  const videoWatermarkCount = selectedVideos.filter(candidate => candidate.watermark).length;
  const blurCount = selectedPhotos.filter(candidate => candidate.blurFaces).length + (stagedPhoto && photoBlurFaces ? 1 : 0);
  const editSavedPhoto=(mediaId:string)=>window.dispatchEvent(new CustomEvent("chile3x:edit-saved-photo",{detail:{mediaId}}));

  const fileDrop = useMediaFileDrop({ disabled: isBusy || quota.level === "blocked", onError: setNotice, onFiles: (files, kind) => {
    if (kind === "profile") void uploadProfilePhoto(files);
    else void chooseGallery(files, kind);
  } });
  return <section ref={managerRoot} className={`profile-media-manager media-file-drop-surface${fileDrop.draggingFiles ? " is-file-dragging" : ""}`} id="fotos-y-videos" tabIndex={-1} {...fileDrop.handlers}>
    <div className="profile-media-manager-heading"><div><p className="eyebrow">{sampleMode ? "MEDIOS DE LA MUESTRA PRIVADA" : "MEDIOS DEL ANUNCIO"}</p><h2>{sampleMode ? "Fotos y videos de la muestra" : "Fotos y videos"}</h2><span>{sampleMode ? "Usa la misma edición de fotos y videos del anuncio: foto principal, recorte, marca de agua y privacidad. Solo administradores gestionan estos archivos; se mantienen privados y no requieren aprobación." : adminMode ? "Puedes subir foto principal y galería para esta cuenta. Los archivos que cargues como administrador se aprueban inmediatamente; los que suba la persona usuaria mantienen su revisión habitual." : "Separa tu foto principal de la galería pública. Todo material llega primero a revisión. El contenido exclusivo se administra desde la sección Contenido de tu cuenta."}</span></div><strong>{images.length}/10 fotos<br />{videos.length}/3 videos</strong></div>
    <p className={`media-quota media-quota-${quota.level}`}><b>Uso de R2: {formatBytes(quota.bytes)}</b>{quota.message}</p>{notice && <p className="media-manager-notice" role="status">{notice}</p>}
    <p className="media-drop-intro">Arrastra fotos o videos desde tu equipo hasta su sección, o usa los botones para elegir archivos. Quedarán seleccionados para revisar antes de subir.</p>
    <p className="media-manager-independent-notice">{sampleMode ? "Los medios se guardan por separado de los datos de la muestra. Elegir archivos o generar vistas previas no los sube: confirma cada carga cuando estés conforme. Solo se conserva el archivo final." : "Las fotos y videos se guardan por separado. Subir, reemplazar o eliminar un archivo no retira un anuncio publicado; solo el material nuevo espera aprobación. No necesitas guardar nuevamente los datos del anuncio."}</p>
    {selectedMediaCount > 0 && <fieldset className="gallery-global-photo-options"><legend>Opciones para los archivos seleccionados</legend><p>La marca de agua se aplica a todas las fotos y videos seleccionados, incluida la principal. El difuminado se aplica solo a fotos. Los archivos guardados se gestionan por separado.</p><div><ActionButton className="button button-outline" type="button" disabled={isBusy} aria-pressed={watermarkCount === selectedMediaCount} onClick={() => applyToSelection("watermark", watermarkCount !== selectedMediaCount)}>{watermarkCount === selectedMediaCount ? "Quitar marca de agua de todos" : "Marca de agua en todos"}<small>{watermarkCount} de {selectedMediaCount} archivos activados</small></ActionButton>{selectedPhotoCount > 0 && (adminMode || mediaSettings.faceBlurEnabled) && <ActionButton className="button button-outline" type="button" disabled={isBusy} aria-pressed={blurCount === selectedPhotoCount} onClick={() => applyToSelection("blurFaces", blurCount !== selectedPhotoCount)}>{blurCount === selectedPhotoCount ? "Quitar difuminado de todas las fotos" : "Difuminar rostros en todas las fotos"}<small>{blurCount} de {selectedPhotoCount} fotos activadas</small></ActionButton>}</div></fieldset>}
    {adminMode && !sampleMode && moderationBulk && <div className="media-moderation-bulk">{moderationBulk}<p>La aprobación de archivos y la publicación del anuncio son independientes. Los archivos pendientes solo los ven su titular y administración.</p></div>}
    {qualityWarning && <p className="photo-quality-warning" role="status">{qualityWarning}</p>}
    <section className="profile-primary-photo-block" aria-label="Foto principal" data-media-kind="profile">
    <div className="profile-photo-manager"><div><p className="eyebrow">PASO 1 · FOTO PRINCIPAL</p><h3>Foto de perfil</h3><span>{sampleMode ? "Es la imagen principal al abrir la muestra privada. Puedes recortarla, aplicar marca de agua o privacidad facial antes de guardarla. Si subes otra principal, la anterior pasa a la galería." : "Es la imagen prioritaria en el directorio y al abrir el aviso. Puedes recortarla y añadir una marca de agua grande, centrada y sin colores. Sube el archivo original para mantener su calidad."}</span><div className="admin-photo-processing-options"><label><input type="checkbox" checked={photoWatermark} disabled={isBusy} onChange={event => { setPhotoWatermark(event.target.checked); setPreparedPhoto(undefined); }} />Marca de agua centrada</label>{(adminMode || mediaSettings.faceBlurEnabled) && <label><input type="checkbox" checked={photoBlurFaces} disabled={isBusy} onChange={event => { setPhotoBlurFaces(event.target.checked); setPreparedPhoto(undefined); }} />Difuminar rostros</label>}</div></div><label className="button button-outline">{isBusy ? "Procesando…" : "Elegir foto de perfil"}<input aria-label="Elegir foto de perfil" ref={profilePhotoInputRef} type="file" accept={IMAGE_INPUT_ACCEPT} disabled={isBusy || quota.level === "blocked"} onChange={event => uploadProfilePhoto(event.target.files)} /></label></div>
    <p className="media-drop-hint">Arrastra aquí una foto de perfil o usa «Elegir foto de perfil».</p>
    {stagedPhoto && <section className="staged-profile-photo"><strong className="selected-photo-filename">{originalPhoto?.name ?? stagedPhoto.name}</strong>
      <SelectedPhotoPreview file={stagedPhoto} watermark={photoWatermark} blurFaces={photoBlurFaces} regions={photoRegions} disabled={isBusy} prepared={preparedPhoto} onBusyChange={setIsBusy} edited={stagedPhoto !== originalPhoto} onPrepared={result => { setPreparedPhoto(result.file); setQualityWarning(result.qualityWarning); }} onEdit={file => { setStagedPhoto(file); setPreparedPhoto(undefined); setPhotoRegions([]); }} onRestore={() => { setStagedPhoto(originalPhoto); setPreparedPhoto(undefined); setPhotoRegions([]); }} />
      {photoBlurFaces && <FacePrivacyEditor file={stagedPhoto} regions={photoRegions} onChange={regions => { setPhotoRegions(regions); setPreparedPhoto(undefined); }} disabled={isBusy} />}
      <div className="face-privacy-actions"><ActionButton type="button" className="button button-primary" disabled={isBusy} onClick={uploadStagedPhoto}>{isBusy ? "Procesando…" : sampleMode ? "Guardar foto principal" : adminMode ? "Procesar y aprobar foto principal" : "Enviar foto principal a revisión"}</ActionButton><ActionButton type="button" className="button button-outline" disabled={isBusy} onClick={() => { setStagedPhoto(null); setOriginalPhoto(null); setPreparedPhoto(undefined); setPhotoRegions([]); }}>Cancelar foto seleccionada</ActionButton></div></section>}
    {profilePhotos.length > 0 && <div className="profile-photo-preview-list">{profilePhotos.map(item => <article key={item.id}><div className="media-owner-preview"><a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir foto principal completa"><Image src={item.url} alt="Vista previa completa de foto de perfil" fill unoptimized sizes="210px" /></a></div><div><span className={`media-status media-status-${item.moderationStatus}`}>{sampleMode ? "Muestra" : statusLabel[item.moderationStatus]}</span>{adminMode && !sampleMode && moderationActions?.[item.id]}<small>Foto principal · {formatBytes(item.byteSize)}</small><a className="media-owner-open" href={item.url} target="_blank" rel="noopener noreferrer">Ver foto completa</a>{<ActionButton className="button button-outline" type="button" disabled={isBusy} onClick={()=>editSavedPhoto(item.id)}>Editar marca y rostros</ActionButton>}<ActionButton className="button button-outline media-owner-remove" type="button" onClick={() => remove(item.id)} disabled={isBusy}>{item.replacementOf ? "Cancelar edición pendiente" : "Eliminar"}</ActionButton></div></article>)}</div>}
    </section>
    {(["image", "video"] as const).map(kind => {
      const photos = kind === "image", sectionMedia = photos ? images : videos;
      const selection = photos ? selectedPhotos : selectedVideos;
      const canChoose = !isBusy && quota.level !== "blocked" && sectionMedia.length + selection.length < (photos ? 10 : 3);
      const uploadLabel = sampleMode ? `Guardar ${photos ? "fotos" : "videos"} de la muestra` : adminMode ? `Procesar y aprobar ${photos ? "fotos" : "videos"}` : `Enviar ${photos ? "fotos" : "videos"} a revisión`;
      const uploadSelectionButton = <ActionButton className="button button-primary gallery-selection-save" type="button" disabled={isBusy || selection.some(candidate => !candidate.image && !candidate.trim)} onClick={() => uploadCandidates(kind)}>{isBusy ? "Procesando archivos…" : uploadLabel}</ActionButton>;
      return <section key={kind} className="profile-public-gallery-manager" aria-label={photos ? "Fotos de galería" : "Videos de galería"} data-media-kind={kind}>
      <div><p className="eyebrow">PASO {photos ? "2" : "3"} · {sampleMode ? "GALERÍA PÚBLICA DE MUESTRA" : "GALERÍA PÚBLICA"}</p><h3>{photos ? "Fotos de la galería" : "Videos de la galería"}</h3><p>{photos ? `Recorta y aplica marca de agua a tus fotos. ${adminMode || mediaSettings.faceBlurEnabled ? "También puedes difuminar rostros." : "El difuminado facial está desactivado temporalmente por el equipo."}` : "Elige el inicio y el final de cada video. Puedes aplicar o quitar la marca de agua en todos los videos seleccionados antes de subirlos."}</p></div>
      <label className={`button button-primary${!canChoose ? " is-disabled" : ""}`} aria-disabled={!canChoose}>{isBusy ? "Procesando…" : photos ? "Elegir fotos" : "Elegir videos"}<input ref={photos ? photoGalleryInputRef : videoGalleryInputRef} aria-label={photos ? "Elegir fotos de galería" : "Elegir videos de galería"} type="file" accept={photos ? IMAGE_INPUT_ACCEPT : VIDEO_INPUT_ACCEPT} multiple disabled={!canChoose} onChange={(event) => chooseGallery(event.target.files, kind)} /></label>
      <p className="media-drop-hint">Arrastra aquí {photos ? "fotos" : "videos"} o usa «{photos ? "Elegir fotos" : "Elegir videos"}». Se revisan y guardan por separado.</p>
      <small>{photos ? IMAGE_UPLOAD_RULES : VIDEO_UPLOAD_RULES} Máximo {photos ? "10 fotos de galería" : "3 videos"} por {sampleMode ? "muestra" : "anuncio"}. Solo se guarda el archivo final; conserva tu original para volver a editarlo después.</small>
      {!photos && selectedVideos.length > 0 && <div className="gallery-video-bulk-actions"><ActionButton className="button button-outline" type="button" disabled={isBusy} aria-pressed={videoWatermarkCount === selectedVideos.length} onClick={() => applyToSelection("watermark", videoWatermarkCount !== selectedVideos.length, "video")}><ActionIcon name="video" />{videoWatermarkCount === selectedVideos.length ? "Quitar marca de todos los videos" : "Marca de agua en todos los videos"}</ActionButton><span>{videoWatermarkCount} de {selectedVideos.length} videos seleccionados con marca de agua</span></div>}
      {photos && <div className="profile-gallery-photo-tools">
        <p className="gallery-saved-tools-help">Estas herramientas editan o eliminan fotos ya guardadas, incluida la de perfil. {storedPhotos.length === 0 ? `Primero selecciona y ${sampleMode ? "guarda las fotos de la muestra" : adminMode ? "procesa y aprueba las fotos" : "envía las fotos a revisión"} con el botón de la sección Fotos seleccionadas; después se habilitarán estas opciones.` : "Las fotos seleccionadas sin subir se ajustan desde Opciones para los archivos seleccionados."}</p>
        {<AdminPhotoTools showBulkActions ownerProfileId={adminMode ? undefined : profileId} allowFaceBlur={adminMode || mediaSettings.faceBlurEnabled} sampleId={sampleMode ? profileId : undefined} profileName={sampleMode ? "esta muestra privada" : undefined} images={storedPhotos} disabled={isBusy} onBusyChange={setIsBusy} onSaved={result=>{savedRevision.current={id:profileId,revision:result.revision};setQuota(result.quota);setMedia(current=>current.map(item=>item.id===result.mediaId?result.replacement??{...item,url:sampleMode ? `/muestra/${profileId}/archivo/${item.id}?v=${result.revision}` : `/media/${item.id}?v=${result.revision}`}:item));}} />}
        <div className="profile-photo-delete-actions"><ActionButton ref={deletePhotosTrigger} className="button button-outline" type="button" disabled={isBusy||!storedPhotos.length} aria-expanded={confirmDeletePhotos} onClick={()=>{setDeleteConfirmation("");setConfirmDeletePhotos(true);}}><ActionIcon name="trash" />Eliminar todas las fotos</ActionButton></div>
        {confirmDeletePhotos&&<fieldset className="profile-photo-delete-confirmation"><legend>Confirmar eliminación de fotos</legend><p>Se eliminarán {storedPhotos.length} fotos guardadas, incluida la foto de perfil si existe. Esta acción no se puede deshacer. Los videos y los archivos seleccionados sin subir se conservan.</p><label>Escribe ELIMINAR para confirmar<input ref={deletePhotosInput} value={deleteConfirmation} onChange={event=>setDeleteConfirmation(event.target.value)} maxLength={8} autoComplete="off" spellCheck={false} disabled={isBusy} /></label><div><ActionButton className="button button-danger" type="button" disabled={isBusy||deleteConfirmation!=="ELIMINAR"} onClick={()=>void removeAllPhotos()}>{isBusy ? "Eliminando fotos…" : "Confirmar eliminación de fotos"}</ActionButton><ActionButton className="button button-outline" type="button" disabled={isBusy} onClick={()=>{setConfirmDeletePhotos(false);setDeleteConfirmation("");deletePhotosTrigger.current?.focus({preventScroll:true});}}>Cancelar</ActionButton></div></fieldset>}
      </div>}
      {selection.length > 0 && <div className="gallery-upload-candidates"><div className="gallery-selection-heading"><strong>{photos ? "Fotos seleccionadas" : "Videos seleccionados"}</strong><span>Revisa el resultado antes de confirmar la carga de esta sección.</span>{uploadSelectionButton}</div><div className="gallery-candidate-grid">{selection.map(candidate => <article key={candidate.id}>
        <div><strong title={candidate.originalFile.name}>{candidate.originalFile.name}</strong><small>{candidate.image ? "Foto" : "Video"} original · {formatBytes(candidate.originalFile.size)}</small>{candidate.prepared && <small>Versión final para subir: {formatBytes(candidate.prepared.size)} · máximo {(candidate.image ? MAX_IMAGE_UPLOAD_BYTES : MAX_PREPARED_VIDEO_BYTES) / 1_000_000} MB</small>}</div>
        <label className="gallery-face-blur-option"><input type="checkbox" checked={candidate.watermark} disabled={isBusy} onChange={event => updateCandidate(candidate.id, { watermark: event.target.checked, file: candidate.image ? candidate.file : candidate.originalFile, prepared: undefined, status: "ready", detail: candidate.image ? "Lista para procesar." : "Opción actualizada. Prepara y revisa el video nuevamente; aún no se subió." })} />Marca de agua centrada</label>
        {candidate.image && (adminMode || mediaSettings.faceBlurEnabled) && <label className="gallery-face-blur-option"><input type="checkbox" checked={candidate.blurFaces} disabled={isBusy} onChange={event => updateCandidate(candidate.id, { blurFaces: event.target.checked, prepared: undefined, detail: "Lista para procesar." })} />Difuminar rostros</label>}
        <span className={`gallery-upload-status is-${candidate.status}`} role="status">{candidate.detail}</span>
        {!candidate.image && <><VideoTrimEditor file={candidate.originalFile} value={candidate.trim} disabled={isBusy} onChange={trim => updateCandidate(candidate.id, { trim, file: candidate.originalFile, prepared: undefined, status: "ready", detail: "Recorte actualizado. Prepara el video para revisar el resultado final." })} />{candidate.prepared && <SelectedVideoPreview file={candidate.prepared} />}<ActionButton type="button" className="button button-outline" disabled={isBusy || !candidate.trim || Boolean(candidate.prepared)} onClick={() => previewVideo(candidate)}>{candidate.prepared ? "Video preparado" : "Preparar video y revisar"}</ActionButton>{candidate.status === "processing" && <ActionButton type="button" className="button button-outline" onClick={() => videoAbortRef.current?.abort()}>Cancelar preparación</ActionButton>}</>}
        {candidate.image && <SelectedPhotoPreview file={candidate.file} watermark={candidate.watermark} blurFaces={candidate.blurFaces} regions={candidate.faceRegions} disabled={isBusy} prepared={candidate.prepared} onBusyChange={setIsBusy} edited={candidate.file !== candidate.originalFile} onPrepared={result => { updateCandidate(candidate.id, { prepared: result.file, status: "ready", detail: "Vista previa lista para subir." }); setQualityWarning(result.qualityWarning); }} onEdit={file => updateCandidate(candidate.id, { file, prepared: undefined, faceRegions: [], status: "ready", detail: "Recorte aplicado. Revisa el resultado." })} onRestore={() => updateCandidate(candidate.id, { file: candidate.originalFile, prepared: undefined, faceRegions: [], status: "ready", detail: "Foto original restaurada." })} />}
        {candidate.image && candidate.blurFaces && <FacePrivacyEditor file={candidate.file} regions={candidate.faceRegions} disabled={isBusy} onChange={regions => updateCandidate(candidate.id, { faceRegions: regions, prepared: undefined, status: "ready", detail: regions.length ? "Zonas manuales listas para procesar." : "Se usará detección automática." })} />}
        <ActionButton type="button" className="gallery-candidate-remove" disabled={isBusy} onClick={() => setCandidates(current => current.filter(item => item.id !== candidate.id))}>Quitar</ActionButton>
      </article>)}</div>{uploadSelectionButton}</div>}
      {sectionMedia.length > 1 && <p className="gallery-order-help">Usa Izquierda y Derecha para elegir el orden de la galería. Cada movimiento se guarda automáticamente.</p>}
      {sectionMedia.length > 0 ? <div className="media-owner-grid">{sectionMedia.map((item, index) => <article key={item.id} data-media-id={item.id}><div className="media-owner-preview">{item.mediaType === "image" ? <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto ${index + 1} completa`}><Image src={item.url} alt={`Vista previa completa de foto ${index + 1}`} fill unoptimized sizes="(max-width: 620px) 80vw, 240px" /></a> : <MediaVideo src={item.url} contentType={item.contentType} label={sampleMode ? "Video de la muestra" : "Video del anuncio"} />}</div><div><span className={`media-status media-status-${item.moderationStatus}`}>{sampleMode ? "Muestra" : statusLabel[item.moderationStatus]}</span>{adminMode && !sampleMode && moderationActions?.[item.id]}<small>{item.mediaType === "video" ? "Video · " : "Foto · "}{formatBytes(item.byteSize)}</small>{item.mediaType === "image" && <><a className="media-owner-open" href={item.url} target="_blank" rel="noopener noreferrer">Ver foto completa</a>{<ActionButton className="button button-outline" type="button" disabled={isBusy} onClick={()=>editSavedPhoto(item.id)}>Editar marca y rostros</ActionButton>}</>}{<div className="sample-media-order-actions">{sampleMode && item.mediaType === "image" && <ActionButton type="button" className="button button-outline" disabled={isBusy} onClick={() => updateSampleMedia(item.id)}>Usar como foto principal</ActionButton>}<div><ActionButton type="button" className="button button-outline" disabled={isBusy || index === 0} aria-label={`Mover ${photos ? "foto" : "video"} ${index + 1} a la izquierda`} onClick={() => void moveMedia(item.id, -1)}><ActionIcon name="back" />Izquierda</ActionButton><ActionButton type="button" className="button button-outline" disabled={isBusy || index === sectionMedia.length - 1} aria-label={`Mover ${photos ? "foto" : "video"} ${index + 1} a la derecha`} onClick={() => void moveMedia(item.id, 1)}>Derecha<ActionIcon name="next" /></ActionButton></div></div>}<ActionButton className="button button-outline media-owner-remove" type="button" onClick={() => remove(item.id)} disabled={isBusy}>{item.replacementOf ? "Cancelar edición pendiente" : "Eliminar"}</ActionButton></div></article>)}</div> : <p className="profile-media-empty">{`Aún no has agregado ${photos ? "fotos" : "videos"} a ${sampleMode ? "la galería pública de muestra" : "la galería pública"}.`}</p>}
    </section>;
    })}
  </section>;
}
