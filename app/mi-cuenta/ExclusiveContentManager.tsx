"use client";
import { ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";
import { selectGalleryFiles } from "@/lib/media-file-selection";
import { useMediaFileDrop } from "./useMediaFileDrop";
import "./exclusive-content-manager.css";

import { VideoTrimEditor } from "./VideoTrimEditor";
import type { VideoTrim } from "@/lib/video-trim-policy";
import { MediaVideo } from "@/app/MediaVideo";
import Image from "next/image";
import { assertVideoSource, isVideoSource, VIDEO_INPUT_ACCEPT, VIDEO_UPLOAD_RULES } from "@/lib/video-policy";
import { uploadMediaRequest } from "@/lib/upload-response";
import { MAX_IMAGE_UPLOAD_BYTES, assertImageSource, isImageSource, IMAGE_INPUT_ACCEPT, IMAGE_UPLOAD_RULES } from "@/lib/image-upload-policy";
import { prepareGalleryImage } from "./watermark-image";
import { useEffect, useRef, useState } from "react";

type Media = {
  id: string;
  url: string;
  mediaType: "image" | "video";
  contentType: string;
  moderationStatus: "pending" | "approved" | "rejected";
  byteSize: number;
};
type Selection = { id: string; file: File; image: boolean; trim?: VideoTrim };
type Grant = { userId: string; username: string; displayName: string | null; createdAt: string };
type Escort = { id: string; displayName: string; handle: string | null; status: string };
type Quota = { bytes: number; level: "ok" | "warning" | "blocked"; message: string };

const statusLabel = { pending: "En revisión", approved: "Publicado", rejected: "Rechazado" };

function formatBytes(bytes: number) {
  return bytes < 1_000_000 ? `${Math.round(bytes / 1_000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function ExclusiveContentManager({
  initialMedia,
  initialGrants,
  escortProfiles,
  linkedProfileId,
  initialQuota,
}: {
  initialMedia: Media[];
  initialGrants: Grant[];
  escortProfiles: Escort[];
  linkedProfileId: string | null;
  initialQuota: Quota;
}) {
  const [media, setMedia] = useState(initialMedia);
  const [grants, setGrants] = useState(initialGrants);
  const [linkedId, setLinkedId] = useState(linkedProfileId ?? "");
  const [identifier, setIdentifier] = useState("");
  const [quota, setQuota] = useState(initialQuota);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null), videoInputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<Selection[]>([]);
  const videoAbort = useRef<AbortController | null>(null);
  useEffect(() => () => videoAbort.current?.abort(), []);
  const images = media.filter((item) => item.mediaType === "image");
  const videos = media.filter((item) => item.mediaType === "video");

  async function updateLink(profileId: string) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/mi-cuenta/contenido/vinculo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: profileId || null }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo actualizar el vínculo.");
      setLinkedId(profileId);
      setNotice(profileId ? "El contenido exclusivo quedó vinculado a este anuncio Escort." : "El contenido se mantiene en tu cuenta, pero no se muestra en ningún anuncio público.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo actualizar el vínculo."); } finally { setBusy(false); }
  }

  async function addAccess(event: React.FormEvent) {
    event.preventDefault();
    if (!identifier.trim() || busy) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/mi-cuenta/contenido/accesos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier }) });
      const payload = await response.json() as { error?: string; grant?: Grant };
      if (!response.ok || !payload.grant) throw new Error(payload.error ?? "No se pudo autorizar la cuenta.");
      setGrants((current) => current.some((item) => item.userId === payload.grant!.userId) ? current : [...current, payload.grant!]);
      setIdentifier("");
      setNotice("La cuenta autorizada verá el contenido desde el menú Mi contenido.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo autorizar la cuenta."); } finally { setBusy(false); }
  }

  async function removeAccess(userId: string) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/mi-cuenta/contenido/accesos", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId }) });
      if (!response.ok) throw new Error("No se pudo retirar el acceso.");
      setGrants((current) => current.filter((item) => item.userId !== userId));
      setNotice("Acceso retirado. La biblioteca se actualizará para esa cuenta.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo retirar el acceso."); } finally { setBusy(false); }
  }

  function chooseFiles(files: FileList | readonly File[] | null, kind?: "image" | "video") {
    if (!files?.length || busy) return;
    if (quota.level === "blocked") { setNotice(quota.message); return; }
    const { selected, errors } = selectGalleryFiles(Array.from(files), {
      kind, imageLimit: 20, videoLimit: 4,
      imageCount: images.length + selection.filter(item => item.image).length,
      videoCount: videos.length + selection.filter(item => !item.image).length,
    });
    const accepted = selected.map(({file, image}) => ({ id: crypto.randomUUID(), file, image }));
    setSelection(current => [...current, ...accepted]);
    setNotice(errors.length ? `No se seleccionaron estos archivos:\n${errors.join("\n")}` : "Archivos seleccionados. Revisa la lista y confirma el envío a revisión privada.");
    if (photoInputRef.current) photoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  }

  async function upload(kind: "image" | "video") {
    const pending = selection.filter(item => item.image === (kind === "image"));
    if (!pending.length || busy || pending.some(item => !item.image && !item.trim)) return;
    if (quota.level === "blocked") { setNotice(quota.message); return; }
    setBusy(true); setNotice("");
    try {
      let addedImages = 0;
      let addedVideos = 0;
      const failures: string[] = [];
      for (const selected of pending) {
        const original = selected.file;
        try {
        const isImage = isImageSource(original);
        const isVideo = !isImage && isVideoSource(original);
        if (!isImage && !isVideo) throw new Error("Elige imágenes JPEG, PNG o WebP, o videos MP4/WebM/MOV.");
        if (isImage) assertImageSource(original.size);
        let prepared = original;
        if (isImage) {
          if (images.length + addedImages >= 20) throw new Error("Tu biblioteca alcanzó las 20 fotos. Elimina una antes de agregar otra.");
          const result = await prepareGalleryImage(original, { maxBytes: MAX_IMAGE_UPLOAD_BYTES, maxDimension: 2200, applyWatermark: false, blurFaces: false, onProgress: detail => setNotice(`${original.name}: ${detail}`) });
          prepared = result.file;
        }
        if (isVideo) {
          assertVideoSource(original.size);
          if (videos.length + addedVideos >= 4) throw new Error("Puedes subir hasta 4 videos de contenido exclusivo.");
          const { prepareVideo } = await import("./prepare-video");
          const controller = new AbortController(); videoAbort.current = controller;
          const result = await prepareVideo(original, { trim: selected.trim, signal: controller.signal, onProgress: detail => setNotice(`${original.name}: ${detail}`) });
          videoAbort.current = null;
          prepared = result.file;
        }
        if (isImage && images.length + addedImages >= 20) throw new Error("Puedes subir hasta 20 imágenes de contenido exclusivo.");
        const form = new FormData(); form.set("file", prepared);
        const payload = await uploadMediaRequest<{ error?: string; media?: Media; quota?: Quota }>("/api/mi-cuenta/contenido/medios", form);
        if (!payload.media || !payload.quota) throw new Error("El servidor no confirmó el archivo. Revisa la biblioteca antes de reintentar para evitar duplicados.");
        setMedia((current) => [...current, payload.media!]); setQuota(payload.quota);
        setSelection(current => current.filter(item => item.id !== selected.id));
        if (isImage) addedImages += 1;
        if (isVideo) addedVideos += 1;
        } catch (cause) { failures.push(`${original.name}: ${cause instanceof Error ? cause.message : "No se pudo preparar este archivo."}`); }
        finally { videoAbort.current = null; }
      }
      setNotice(`${addedImages + addedVideos} archivo(s) enviado(s) a revisión privada.${failures.length ? `\nNo se completaron ${failures.length}:\n${failures.join("\n")}` : " Solo se guardaron las versiones finales."}`);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo subir el archivo."); } finally { setBusy(false); }
  }

  async function removeMedia(mediaId: string) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/mi-cuenta/contenido/medios/${mediaId}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string; quota?: Quota };
      if (!response.ok || !payload.quota) throw new Error(payload.error ?? "No se pudo eliminar el archivo.");
      setMedia((current) => current.filter((item) => item.id !== mediaId)); setQuota(payload.quota); setNotice("El archivo fue eliminado de tu contenido exclusivo.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo eliminar el archivo."); } finally { setBusy(false); }
  }

  const fileDrop = useMediaFileDrop({ disabled: busy || quota.level === "blocked", onError: setNotice, onFiles: (files, kind) => chooseFiles(files, kind === "profile" ? undefined : kind) });
  return <section className={`exclusive-content-manager media-file-drop-surface${fileDrop.draggingFiles ? " is-file-dragging" : ""}`} {...fileDrop.handlers}>
    <header><div><p className="eyebrow">CONTENIDO EXCLUSIVO</p><h2>Tu biblioteca privada</h2><p>Este contenido pertenece a tu cuenta. Si pausas o eliminas el anuncio vinculado, las personas autorizadas seguirán accediendo desde su propio menú Mi contenido.</p></div><strong>{images.length}/20 fotos<br />{videos.length}/4 videos</strong></header>
    <p className={`media-quota media-quota-${quota.level}`}><b>Uso de R2: {formatBytes(quota.bytes)}</b>{quota.message}</p>
    {notice && <p className="media-manager-notice" role="status">{notice}</p>}
    <section className="exclusive-content-link"><div><p className="eyebrow">VÍNCULO PÚBLICO</p><h3>Mostrar al final de un anuncio Escort</h3><p>Solo puedes vincular esta biblioteca a un anuncio Escort de tu cuenta. El público verá la galería bloqueada hasta que autorices su acceso.</p></div><label>Anuncio vinculado<select value={linkedId} disabled={busy} onChange={(event) => updateLink(event.target.value)}><option value="">No mostrar en un anuncio por ahora</option>{escortProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}{profile.handle ? ` (@${profile.handle})` : ""} · {profile.status}</option>)}</select></label></section>
    <p className="exclusive-library-separation">Biblioteca privada · Se administra por separado de la galería pública del anuncio. Sus archivos solo estarán disponibles tras aprobación y para las cuentas que autorices.</p>
    <p className="media-drop-intro">Puedes arrastrar varios archivos desde tu equipo o elegirlos con los botones. Se envían a revisión privada cuando confirmas la carga de cada sección.</p>
    {(["image", "video"] as const).map(kind => {
      const photos = kind === "image", saved = photos ? images : videos, selected = selection.filter(item => item.image === photos);
      const canChoose = !busy && quota.level !== "blocked" && saved.length + selected.length < (photos ? 20 : 4);
      return <section key={kind} className="exclusive-content-library-section" data-media-kind={kind} aria-label={photos ? "Fotos privadas" : "Videos privados"}>
        <header><div><p className="eyebrow">PASO {photos ? "1" : "2"} · BIBLIOTECA PRIVADA</p><h3>{photos ? "Fotos privadas" : "Videos privados"}</h3><p>{photos ? IMAGE_UPLOAD_RULES : VIDEO_UPLOAD_RULES} Máximo {photos ? "20 fotos" : "4 videos"} en tu biblioteca.</p></div>
        <label className={`button button-primary${!canChoose ? " is-disabled" : ""}`}>{busy ? "Procesando…" : photos ? "Elegir fotos privadas" : "Elegir videos privados"}<input ref={photos ? photoInputRef : videoInputRef} type="file" accept={photos ? IMAGE_INPUT_ACCEPT : VIDEO_INPUT_ACCEPT} aria-label={photos ? "Elegir fotos privadas" : "Elegir videos privados"} multiple disabled={!canChoose} onChange={event => chooseFiles(event.target.files, kind)} /></label></header>
        <p className="media-drop-hint">Arrastra aquí {photos ? "varias fotos" : "varios videos"} o usa el botón para elegirlos. Aún no se suben.</p>
        {selected.length > 0 && <div className="exclusive-files-selected"><strong>{photos ? "Fotos privadas seleccionadas" : "Videos privados seleccionados"}</strong><p>Comprueba los archivos antes de enviarlos a revisión.</p>
          <ActionButton type="button" className="button button-primary" disabled={busy || selected.some(item => !item.image && !item.trim)} onClick={() => void upload(kind)}>{busy ? "Procesando…" : `Enviar ${photos ? "fotos" : "videos"} a revisión privada`}</ActionButton>
          <ul>{selected.map(item => <li key={item.id} className={item.image ? undefined : "exclusive-selected-video"}><ActionIcon name={photos ? "image" : "video"} /><span><strong>{item.file.name}</strong><small>{formatBytes(item.file.size)}</small></span>{!item.image && <VideoTrimEditor file={item.file} value={item.trim} disabled={busy} onChange={trim => setSelection(current => current.map(other => other.id === item.id ? {...other, trim} : other))} />}<ActionButton type="button" className="button button-outline" disabled={busy} aria-label={`Quitar ${item.file.name}`} onClick={() => setSelection(current => current.filter(other => other.id !== item.id))}><ActionIcon name="trash" />Quitar</ActionButton></li>)}</ul>
          <ActionButton type="button" className="button button-primary" disabled={busy || selected.some(item => !item.image && !item.trim)} onClick={() => void upload(kind)}>{busy ? "Procesando…" : `Enviar ${photos ? "fotos" : "videos"} a revisión privada`}</ActionButton>
        </div>}
        {saved.length > 0 ? <div className="media-owner-grid exclusive-content-media-grid">{saved.map((item, index) => <article key={item.id}><div className="media-owner-preview">{photos ? <Image src={item.url} alt={`Vista previa privada ${index + 1}`} fill unoptimized sizes="(max-width: 620px) 80vw, 240px" /> : <MediaVideo src={item.url} contentType={item.contentType} label="Video privado" />}</div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>{photos ? "Foto" : "Video"} privado · {formatBytes(item.byteSize)}</small><ActionButton type="button" className="button button-outline" disabled={busy} onClick={() => removeMedia(item.id)}><ActionIcon name="trash" />Eliminar</ActionButton></div></article>)}</div> : <p className="profile-media-empty">Aún no has agregado {photos ? "fotos" : "videos"} a tu biblioteca privada.</p>}
      </section>;
    })}
    <section className="exclusive-content-access"><div><p className="eyebrow">PERSONAS AUTORIZADAS</p><h3>Dar y quitar acceso</h3><p>Busca por nombre de usuario o correo. Para tu privacidad, después de autorizar a alguien verás solo su nombre de usuario.</p></div><form onSubmit={addAccess}><label>Cuenta del cliente<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required maxLength={160} autoCapitalize="none" placeholder="Ej. @camila-cl o camila@correo.cl" /></label><ActionButton className="button button-primary" disabled={busy}>Autorizar</ActionButton></form>{grants.length > 0 ? <div className="exclusive-grant-list">{grants.map((grant) => <article key={grant.userId}><strong>@{grant.username}</strong><ActionButton type="button" disabled={busy} onClick={() => removeAccess(grant.userId)}>Quitar acceso</ActionButton></article>)}</div> : <p className="profile-media-empty">Aún no has autorizado cuentas. Tus archivos permanecen privados.</p>}</section>
  </section>;
}
