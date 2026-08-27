"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Media = {
  id: string;
  url: string;
  mediaType: "image" | "video";
  contentType: string;
  moderationStatus: "pending" | "approved" | "rejected";
  byteSize: number;
};
type Grant = { userId: string; username: string; displayName: string | null; createdAt: string };
type Escort = { id: string; displayName: string; handle: string | null; status: string };
type Quota = { bytes: number; level: "ok" | "warning" | "blocked"; message: string };

const statusLabel = { pending: "En revisión", approved: "Publicado", rejected: "Rechazado" };

function formatBytes(bytes: number) {
  return bytes < 1_000_000 ? `${Math.round(bytes / 1_000)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

function videoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la duración del video.")); };
    video.src = url;
  });
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
  const inputRef = useRef<HTMLInputElement>(null);
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

  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    setBusy(true); setNotice("");
    try {
      let addedImages = 0;
      let addedVideos = 0;
      for (const original of Array.from(files)) {
        const isImage = original.type.startsWith("image/");
        const isVideo = original.type === "video/mp4" || original.type === "video/webm";
        if (!isImage && !isVideo) throw new Error("Elige imágenes JPEG, PNG o WebP, o videos MP4/WebM.");
        if (isImage && original.size > 5_000_000) throw new Error("Cada imagen debe pesar 5 MB o menos.");
        if (isVideo && original.size > 8_000_000) throw new Error("Cada video debe pesar 8 MB o menos.");
        if (isVideo) {
          const duration = await videoDuration(original);
          if (videos.length + addedVideos >= 4 || !Number.isFinite(duration) || duration > 10.05) throw new Error("Puedes subir hasta 4 videos de 10 segundos o menos.");
        }
        if (isImage && images.length + addedImages >= 20) throw new Error("Puedes subir hasta 20 imágenes de contenido exclusivo.");
        const form = new FormData(); form.set("file", original);
        const response = await fetch("/api/mi-cuenta/contenido/medios", { method: "POST", body: form });
        const payload = await response.json() as { error?: string; media?: Media; quota?: Quota };
        if (!response.ok || !payload.media || !payload.quota) throw new Error(payload.error ?? "No se pudo subir el archivo.");
        setMedia((current) => [...current, payload.media!]); setQuota(payload.quota);
        if (isImage) addedImages += 1;
        if (isVideo) addedVideos += 1;
      }
      setNotice("El material se guardó de forma privada y quedó pendiente de revisión.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo subir el archivo."); } finally { if (inputRef.current) inputRef.current.value = ""; setBusy(false); }
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

  return <section className="exclusive-content-manager">
    <header><div><p className="eyebrow">CONTENIDO EXCLUSIVO</p><h2>Tu biblioteca privada</h2><p>Este contenido pertenece a tu cuenta. Si pausas o eliminas el anuncio vinculado, las personas autorizadas seguirán accediendo desde su propio menú Mi contenido.</p></div><strong>{images.length}/20 fotos<br />{videos.length}/4 videos</strong></header>
    <p className={`media-quota media-quota-${quota.level}`}><b>Uso de R2: {formatBytes(quota.bytes)}</b>{quota.message}</p>
    {notice && <p className="media-manager-notice" role="status">{notice}</p>}
    <section className="exclusive-content-link"><div><p className="eyebrow">VÍNCULO PÚBLICO</p><h3>Mostrar al final de un anuncio Escort</h3><p>Solo puedes vincular esta biblioteca a un anuncio Escort de tu cuenta. El público verá la galería bloqueada hasta que autorices su acceso.</p></div><label>Anuncio vinculado<select value={linkedId} disabled={busy} onChange={(event) => updateLink(event.target.value)}><option value="">No mostrar en un anuncio por ahora</option>{escortProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}{profile.handle ? ` (@${profile.handle})` : ""} · {profile.status}</option>)}</select></label></section>
    <section className="exclusive-content-upload"><div><p className="eyebrow">ARCHIVOS</p><h3>Fotos y videos privados</h3><p>Imágenes JPEG, PNG o WebP de hasta 5 MB. Videos MP4/WebM de hasta 8 MB y 10 segundos. Todo llega a revisión antes de quedar disponible.</p></div><label className="button button-primary">{busy ? "Procesando…" : "Subir contenido"}<input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple disabled={busy || quota.level === "blocked"} onChange={(event) => upload(event.target.files)} /></label></section>
    {media.length > 0 && <div className="media-owner-grid exclusive-content-media-grid">{media.map((item, index) => <article key={item.id}><div className="media-owner-preview">{item.mediaType === "image" ? <Image src={item.url} alt={`Vista previa privada ${index + 1}`} fill unoptimized sizes="180px" /> : <video controls preload="metadata"><source src={item.url} type={item.contentType} /></video>}</div><div><span className={`media-status media-status-${item.moderationStatus}`}>{statusLabel[item.moderationStatus]}</span><small>{item.mediaType === "image" ? "Foto" : "Video"} privado · {formatBytes(item.byteSize)}</small><button type="button" disabled={busy} onClick={() => removeMedia(item.id)}>Eliminar</button></div></article>)}</div>}
    <section className="exclusive-content-access"><div><p className="eyebrow">PERSONAS AUTORIZADAS</p><h3>Dar y quitar acceso</h3><p>Busca por nombre de usuario o correo. Para tu privacidad, después de autorizar a alguien verás solo su nombre de usuario.</p></div><form onSubmit={addAccess}><label>Cuenta del cliente<input value={identifier} onChange={(event) => setIdentifier(event.target.value)} required maxLength={160} autoCapitalize="none" placeholder="Ej. @camila-cl o camila@correo.cl" /></label><button className="button button-primary" disabled={busy}>Autorizar</button></form>{grants.length > 0 ? <div className="exclusive-grant-list">{grants.map((grant) => <article key={grant.userId}><strong>@{grant.username}</strong><button type="button" disabled={busy} onClick={() => removeAccess(grant.userId)}>Quitar acceso</button></article>)}</div> : <p className="profile-media-empty">Aún no has autorizado cuentas. Tus archivos permanecen privados.</p>}</section>
  </section>;
}
