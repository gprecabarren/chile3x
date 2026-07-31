import { storyTimeLabel, type StoryType } from "@/lib/stories";

type OwnerStory = { id: string; body: string; storyType: StoryType; expiresAt: string | null };

export function ProfileStoryManager({ profileId, profileName, stories }: { profileId: string; profileName: string; stories: OwnerStory[] }) {
  const textCount = stories.filter((story) => story.storyType === "text").length;
  const imageCount = stories.filter((story) => story.storyType === "image").length;
  const returnTo = `/mi-cuenta/${profileId}/editar#historias`;
  return <section className="profile-story-manager" id="historias">
    <div><p className="eyebrow">ACTUALIZACIONES · 24 HORAS</p><h2>Historias de {profileName}</h2><p>Cada publicación mantiene sus propias historias. Puedes tener hasta 5 de texto y 5 de imagen; se eliminan del directorio al cumplir 24 horas.</p></div>
    <div className="profile-story-manager-forms">
      <form action="/api/historias" method="post"><input name="profile_id" type="hidden" value={profileId} /><input name="return_to" type="hidden" value={returnTo} /><label>Historia de texto <small>{textCount}/5 activas</small><textarea name="body" minLength={2} maxLength={180} required rows={3} placeholder="Ej. Disponible hoy hasta las 22:00" /></label><button className="button button-primary" type="submit" disabled={textCount >= 5}>Publicar texto</button></form>
      <form action="/api/historias" method="post" encType="multipart/form-data"><input name="profile_id" type="hidden" value={profileId} /><input name="return_to" type="hidden" value={returnTo} /><label>Historia de imagen <small>{imageCount}/5 activas</small><input name="image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required /><textarea name="body" maxLength={180} rows={2} placeholder="Descripción opcional" /></label><button className="button button-primary" type="submit" disabled={imageCount >= 5}>Publicar imagen</button></form>
    </div>
    {stories.length > 0 && <div className="owner-story-list"><strong>Historias activas</strong>{stories.map((story) => <article key={story.id}><span>{story.storyType === "image" ? "Imagen" : "Texto"}</span><p>{story.body || "Historia de imagen"}</p><small>{story.expiresAt ? storyTimeLabel(story.expiresAt) : "Expira pronto"}</small><form action={`/api/historias/${story.id}`} method="post"><input name="return_to" type="hidden" value={returnTo} /><button type="submit">Eliminar</button></form></article>)}</div>}
  </section>;
}
