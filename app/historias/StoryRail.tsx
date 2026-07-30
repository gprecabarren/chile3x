import Link from "next/link";
import { storyTimeLabel, type PublicStory } from "@/lib/stories";

type StoryRailProps = {
  stories: PublicStory[];
  city?: string;
  profileOnly?: boolean;
};

export function StoryRail({ stories, city, profileOnly = false }: StoryRailProps) {
  if (!stories.length) return null;
  const title = profileOnly ? "Historias activas" : city ? `Historias en ${city}` : "Historias recientes";
  const description = profileOnly
    ? "Actualizaciones visibles durante 24 horas."
    : city
      ? `Actualizaciones de escorts que se muestran en ${city} durante 24 horas.`
      : "Actualizaciones de escorts de todo Chile, visibles durante 24 horas.";

  return (
    <section className={`story-rail${profileOnly ? " story-rail-profile" : ""}`} aria-label={title}>
      <div className="story-rail-heading"><div><p className="eyebrow">HISTORIAS · 24 HORAS</p><h2>{title}</h2></div><p>{description}</p></div>
      <div className="story-rail-list">
        {stories.map((story) => <article className="story-card" key={story.id}>
          <Link href={`/perfil/${story.profileSlug}#historias`} className="story-card-profile" aria-label={`Ver perfil de ${story.profileName}`}>
            <span>{story.profileName.slice(0, 1)}</span>
            <strong>{story.profileName}</strong>
            {!profileOnly && <small>{story.city}</small>}
          </Link>
          <p>{story.body}</p>
          <small>{storyTimeLabel(story.expiresAt)}</small>
        </article>)}
      </div>
    </section>
  );
}
