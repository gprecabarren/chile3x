"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_STORY_IMAGE_BYTES, MAX_STORY_TEXT_LENGTH, storyTimeLabel, type StoryType } from "@/lib/story-data";
import { IMAGE_INPUT_ACCEPT, isImageSource, assertImageSource } from "@/lib/image-upload-policy";
import { readUploadResponse } from "@/lib/upload-response";
import { VIDEO_INPUT_ACCEPT, isVideoSource, assertVideoSource } from "@/lib/video-policy";

type OwnerStory = { id: string; body: string; storyType: StoryType; expiresAt: string | null };

export function ProfileStoryManager({ profileId, profileName, stories, adminMode = false, canUploadImages = true }: { profileId: string; profileName: string; stories: OwnerStory[]; adminMode?: boolean; canUploadImages?: boolean }) {
  const router = useRouter();
  const textForm = useRef<HTMLFormElement>(null);
  const imageForm = useRef<HTMLFormElement>(null);
  const videoForm = useRef<HTMLFormElement>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<StoryType | null>(null);
  const textCount = stories.filter((story) => story.storyType === "text").length;
  const imageCount = stories.filter((story) => story.storyType === "image").length;
  const videoCount = stories.filter((story) => story.storyType === "video").length;
  const returnTo = adminMode ? `/admin/anuncios-publicaciones/${profileId}/editar#historias` : `/mi-cuenta/${profileId}/historias`;
  const publishEndpoint = adminMode ? `/api/admin/profiles/${profileId}/historias` : "/api/historias";

  async function publish(event: React.FormEvent<HTMLFormElement>, type: StoryType) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const image = data.get("image");
    setBusy(type);
    setNotice("");
    try {
      if (type === "image") {
        if (!(image instanceof File) || !image.size) throw new Error("Selecciona una foto descargada en tu dispositivo. El archivo está vacío o no se eligió.");
        if (!isImageSource(image)) throw new Error("Este formato no es una foto compatible. Selecciona JPEG, PNG, WebP o exporta tu HEIC como JPEG.");
        assertImageSource(image.size);
        setNotice("Preparando la foto de historia… Conserva esta pestaña abierta.");
        const { prepareGalleryImage } = await import("./watermark-image");
        const prepared = await prepareGalleryImage(image, { maxBytes: MAX_STORY_IMAGE_BYTES, maxDimension: 2200, applyWatermark: false, blurFaces: false });
        data.set("image", prepared.file);
      }
      if (type === "video") {
        const video = data.get("video");
        if (!(video instanceof File) || !video.size) throw new Error("Selecciona un video descargado en tu dispositivo; el archivo está vacío o no se eligió.");
        if (!isVideoSource(video)) throw new Error("Selecciona un video MP4, WebM o MOV. Si viene de iPhone, exporta como Más compatible si no se puede leer.");
        assertVideoSource(video.size);
        setNotice("Preparando video… Puede tardar unos segundos; mantén esta pestaña abierta. No se subió el original.");
        const { prepareVideo } = await import("./prepare-video");
        const prepared = await prepareVideo(video, { watermark: data.get("watermark") === "on", onProgress: setNotice });
        data.set("video", prepared.file);
      }
      let result: Response;
      try { result = await fetch(publishEndpoint, { method: "POST", body: data, headers: { Accept: "application/json" } }); }
      catch { throw new Error(navigator.onLine === false ? "Estás sin conexión. Conéctate a internet antes de publicar." : "La conexión se interrumpió. Revisa si la historia aparece antes de repetir el envío para no duplicarla."); }
      await readUploadResponse(result, "Cada foto final de historia admite hasta 5 MB y cada video hasta 12 MB. Vuelve a preparar el archivo y reintenta.");
      form.reset();
      setNotice("Historia publicada. Será visible durante 24 horas.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo publicar la historia.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="profile-story-manager" id="historias">
    <div><p className="eyebrow">ACTUALIZACIONES · 24 HORAS</p><h2>Historias de {profileName}</h2><p>Cada anuncio admite hasta 5 historias de texto, 5 fotos y 3 videos activos. Dejan de ser visibles al cumplir 24 horas. Los archivos y registros vencidos se eliminan automáticamente mediante la limpieza programada del sitio, normalmente durante los siguientes 5 minutos.</p></div>
    {adminMode && <p className="profile-form-help">Publicas en nombre de la cuenta propietaria. Cada publicación o eliminación queda registrada con tu identidad administrativa.</p>}
    {notice && <p className="media-manager-notice" role="status">{notice}</p>}
    <div className="profile-story-manager-forms">
      <form ref={textForm} onSubmit={(event) => publish(event, "text")}><input name="profile_id" type="hidden" value={profileId} /><input name="return_to" type="hidden" value={returnTo} /><label>Historia de texto <small>{textCount}/5 activas · máximo {MAX_STORY_TEXT_LENGTH} caracteres</small><textarea name="body" minLength={2} maxLength={MAX_STORY_TEXT_LENGTH} required rows={3} placeholder="Ej. Disponible hoy hasta las 22:00" /></label><button className="button button-primary" type="submit" disabled={busy !== null || textCount >= 5}>{busy === "text" ? "Publicando…" : "Publicar texto"}</button></form>
      {canUploadImages && <form ref={imageForm} onSubmit={(event) => publish(event, "image")}><input name="profile_id" type="hidden" value={profileId} /><input name="return_to" type="hidden" value={returnTo} /><label>Historia de imagen <small>{imageCount}/5 activas · original hasta 20 MB; versión final hasta 5 MB. JPEG, PNG, WebP y HEIC si tu navegador lo abre.</small><input name="image" type="file" accept={IMAGE_INPUT_ACCEPT} required /><textarea name="body" maxLength={MAX_STORY_TEXT_LENGTH} rows={2} placeholder="Descripción opcional" /></label><button className="button button-primary" type="submit" disabled={busy !== null || imageCount >= 5}>{busy === "image" ? "Preparando / subiendo…" : "Publicar imagen"}</button></form>}
      {canUploadImages && <form ref={videoForm} onSubmit={event => publish(event, "video")}><input name="profile_id" type="hidden" value={profileId} /><input name="return_to" type="hidden" value={returnTo} /><label>Historia de video <small>{videoCount}/3 activos · hasta 15 segundos, original hasta 50 MB y versión final hasta 12 MB.</small><input name="video" type="file" accept={VIDEO_INPUT_ACCEPT} required /><textarea name="body" maxLength={MAX_STORY_TEXT_LENGTH} rows={2} placeholder="Descripción opcional del video" /></label><label className="story-watermark-option"><input name="watermark" type="checkbox" />Marca de agua centrada (opcional)</label><button className="button button-primary" type="submit" disabled={busy !== null || videoCount >= 3}>{busy === "video" ? "Preparando / subiendo…" : "Publicar video"}</button></form>}
    </div>
    {stories.length > 0 && <div className="owner-story-list"><strong>Historias activas</strong>{stories.map((story) => <article key={story.id}><span>{story.storyType === "image" ? "Imagen" : story.storyType === "video" ? "Video" : "Texto"}</span><p>{story.body || `Historia de ${story.storyType === "video" ? "video" : "imagen"}`}</p><small>{story.expiresAt ? storyTimeLabel(story.expiresAt) : "Expira pronto"}</small><form action={adminMode ? publishEndpoint : `/api/historias/${story.id}`} method="post"><input name="return_to" type="hidden" value={returnTo} />{adminMode && <><input type="hidden" name="action" value="delete" /><input type="hidden" name="story_id" value={story.id} /></>}<button type="submit" disabled={busy !== null || (adminMode && story.storyType !== "text" && !canUploadImages)}>Eliminar</button></form></article>)}</div>}
  </section>;
}
