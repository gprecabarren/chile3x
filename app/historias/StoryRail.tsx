"use client";
/* eslint-disable @next/next/no-img-element -- ephemeral R2 stories bypass image optimization intentionally. */

import { useEffect, useMemo, useState } from "react";
import type { PublicStory } from "@/lib/stories";

type StoryRailProps = {
  stories: PublicStory[];
  city?: string;
  profileOnly?: boolean;
};

type StoryGroup = { profileId: string; profileName: string; city: string; stories: PublicStory[] };

function storyTimeLabel(expiresAt: string, now = new Date()) {
  const minutes = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 60_000));
  return minutes >= 60 ? `Disponible ${Math.ceil(minutes / 60)} h más` : `Disponible ${minutes} min más`;
}

function groupStories(stories: PublicStory[]) {
  const groups = new Map<string, StoryGroup>();
  for (const story of stories) {
    const group = groups.get(story.profileId);
    if (group) group.stories.push(story);
    else groups.set(story.profileId, { profileId: story.profileId, profileName: story.profileName, city: story.city, stories: [story] });
  }
  return [...groups.values()];
}

function StoryViewer({ group, startAt, onClose }: { group: StoryGroup; startAt: number; onClose: () => void }) {
  const [index, setIndex] = useState(startAt);
  const story = group.stories[index];

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (index < group.stories.length - 1) setIndex((value) => value + 1);
      else onClose();
    }, story.storyType === "image" ? 6_000 : 7_000);
    return () => window.clearTimeout(timeout);
  }, [group.stories.length, index, onClose, story.id, story.storyType]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setIndex((value) => Math.min(group.stories.length - 1, value + 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [group.stories.length, onClose]);

  return <div className="story-viewer" role="dialog" aria-modal="true" aria-label={`Historia de ${group.profileName}`}>
    <div className="story-viewer-panel">
      <div className="story-viewer-progress" aria-hidden="true">{group.stories.map((item, itemIndex) => <span className={itemIndex <= index ? "is-complete" : ""} key={item.id} />)}</div>
      <header><div><b>{group.profileName}</b><span>{group.city} · {storyTimeLabel(story.expiresAt)}</span></div><button type="button" onClick={onClose} aria-label="Cerrar historia">×</button></header>
      <div className={`story-viewer-content story-viewer-${story.storyType}`}>{story.storyType === "image" && story.imageUrl ? <img src={story.imageUrl} alt={`Historia de ${group.profileName}`} /> : <p>{story.body}</p>}{story.storyType === "image" && story.body && <span>{story.body}</span>}</div>
      <button className="story-viewer-previous" type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} aria-label="Historia anterior">‹</button>
      <button className="story-viewer-next" type="button" onClick={() => index < group.stories.length - 1 ? setIndex((value) => value + 1) : onClose()} aria-label="Historia siguiente">›</button>
    </div>
  </div>;
}

export function StoryRail({ stories, city, profileOnly = false }: StoryRailProps) {
  const groups = useMemo(() => groupStories(stories), [stories]);
  const [open, setOpen] = useState<{ group: StoryGroup; index: number } | null>(null);
  if (!groups.length) return null;
  const title = profileOnly ? "Historias activas" : city ? `Historias en ${city}` : "Actualizaciones de Chile";
  const description = profileOnly ? "Actualizaciones visibles durante 24 horas." : city ? `Actualizaciones de publicaciones en ${city}, visibles durante 24 horas.` : "Historias recientes de publicaciones del directorio nacional.";

  return <section className={`story-rail${profileOnly ? " story-rail-profile" : ""}`} aria-label={title}>
    <div className="story-rail-heading"><div><p className="eyebrow">ACTUALIZACIONES · 24 HORAS</p><h2>{title}</h2></div><p>{description}</p></div>
    <div className="story-bubble-list">{groups.map((group) => {
      const cover = group.stories.find((story) => story.storyType === "image");
      return <button className="story-bubble" type="button" key={group.profileId} onClick={() => setOpen({ group, index: 0 })} aria-label={`Ver historias de ${group.profileName}`}><span className={`story-bubble-avatar${cover ? " has-image" : ""}`}>{cover?.imageUrl ? <img src={cover.imageUrl} alt="" /> : group.profileName.slice(0, 1)}</span><strong>{group.profileName}</strong>{!profileOnly && <small>{group.city}</small>}</button>;
    })}</div>
    {open && <StoryViewer group={open.group} startAt={open.index} onClose={() => setOpen(null)} />}
  </section>;
}

export function ProfileStoryTrigger({ stories }: { stories: PublicStory[] }) {
  const groups = useMemo(() => groupStories(stories), [stories]);
  const [open, setOpen] = useState(false);
  const group = groups[0];
  if (!group) return null;
  return <><button className="profile-story-trigger" type="button" onClick={() => setOpen(true)} aria-label={`Ver historias de ${group.profileName}`}><span>Ver historias</span></button>{open && <StoryViewer group={group} startAt={0} onClose={() => setOpen(false)} />}</>;
}
