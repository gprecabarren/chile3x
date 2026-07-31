"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_STORY_IMAGE_BYTES, MAX_STORY_TEXT_LENGTH, storyTimeLabel, type StoryType } from "@/lib/story-data";

type OwnerStory = { id: string; body: string; storyType: StoryType; expiresAt: string | null };

export function ProfileStoryManager({ profileId, profileName, stories }: { profileId: string; profileName: string; stories: OwnerStory[] }) {
  const router = useRouter();
  const textForm = useRef<HTMLFormElement>(null);
  const imageForm = useRef<HTMLFormElement>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<"text" | "image" | null>(null);
  const textCount = stories.filter((story) => story.storyType === "text").length;
  const imageCount = stories.filter((story) => story.storyType === "image").length;
  const returnTo = `/mi-cuenta/${profileId}/historias`;

  async function publish(event: React.FormEvent<HTMLFormElement>, type: "text" | "image") {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const image = data.get("image");
    if (image instanceof File && image.size > MAX_STORY_IMAGE_BYTES) {
      setNotice("La imagen de historia debe pesar 2 MB o menos. Elige una versión más liviana.");
      return;
    }
    setBusy(type);
    setNotice("");
    try {
      const result = await fetch("/api/historias", { method: "POST", body: data, headers: { Accept: "application/json" } });
      const payload = await result.json().catch(() => ({})) as { error?: string; notice?: string };
      if (!result.ok) throw new Error(payload.error ?? "No se pudo publicar la historia.");
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
    <div><p className="eyebrow">ACTUALIZACIONES · 24 HORAS</p><h2>Historias de {profileName}</h2><p>Cada publicación tiene sus propias historias. Puedes tener hasta 5 de texto y 5 de imagen. Las imágenes se eliminan de R2 y de la base de datos al cumplir 24 horas.</p></div>
    {notice && <p className="media-manager-notice" role="status">{notice}</p>}
    <div className="profile-story-manager-forms">
      <form ref={textForm} onSubmit={(event) => publish(event, "text")}><input name="profile_id" type="hidden" value={profileId} /><input name="return_to" type="hidden" value={returnTo} /><label>Historia de texto <small>{textCount}/5 activas · máximo {MAX_STORY_TEXT_LENGTH} caracteres</small><textarea name="body" minLength={2} maxLength={MAX_STORY_TEXT_LENGTH} required rows={3} placeholder="Ej. Disponible hoy hasta las 22:00" /></label><button className="button button-primary" type="submit" disabled={busy !== null || textCount >= 5}>{busy === "text" ? "Publicando…" : "Publicar texto"}</button></form>
      <form ref={imageForm} onSubmit={(event) => publish(event, "image")}><input name="profile_id" type="hidden" value={profileId} /><input name="return_to" type="hidden" value={returnTo} /><label>Historia de imagen <small>{imageCount}/5 activas · JPEG, PNG o WebP; máximo 2 MB</small><input name="image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required /><textarea name="body" maxLength={MAX_STORY_TEXT_LENGTH} rows={2} placeholder="Descripción opcional" /></label><button className="button button-primary" type="submit" disabled={busy !== null || imageCount >= 5}>{busy === "image" ? "Subiendo…" : "Publicar imagen"}</button></form>
    </div>
    {stories.length > 0 && <div className="owner-story-list"><strong>Historias activas</strong>{stories.map((story) => <article key={story.id}><span>{story.storyType === "image" ? "Imagen" : "Texto"}</span><p>{story.body || "Historia de imagen"}</p><small>{story.expiresAt ? storyTimeLabel(story.expiresAt) : "Expira pronto"}</small><form action={`/api/historias/${story.id}`} method="post"><input name="return_to" type="hidden" value={returnTo} /><button type="submit">Eliminar</button></form></article>)}</div>}
  </section>;
}
