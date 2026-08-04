"use client";
/* eslint-disable @next/next/no-img-element -- ephemeral R2 stories bypass image optimization intentionally. */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicStory } from "@/lib/stories";

type StoryRailProps = {
  stories: PublicStory[];
  city?: string;
  profileOnly?: boolean;
  withActivity?: boolean;
};

type StoryGroup = { profileId: string; profileSlug: string; profileHandle: string | null; profileName: string; profileImageUrl: string | null; city: string; stories: PublicStory[] };

function profileHref({ profileHandle, profileSlug }: Pick<StoryGroup, "profileHandle" | "profileSlug">) {
  return profileHandle ? `/perfil/@${encodeURIComponent(profileHandle)}` : `/perfil/${profileSlug}`;
}

const seenStorageKey = "chile3x-seen-stories-v1";

function storyTimeLabel(expiresAt: string, now = new Date()) {
  const minutes = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 60_000));
  return minutes >= 60 ? `Disponible ${Math.ceil(minutes / 60)} h más` : `Disponible ${minutes} min más`;
}

function activityTimeLabel(createdAt: string, now = new Date()) {
  const minutes = Math.max(1, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `hace ${hours} h` : `hace ${Math.floor(hours / 24)} d`;
}

function groupStories(stories: PublicStory[]) {
  const groups = new Map<string, StoryGroup>();
  for (const story of stories) {
    const group = groups.get(story.profileId);
    if (group) group.stories.push(story);
    else groups.set(story.profileId, { profileId: story.profileId, profileSlug: story.profileSlug, profileHandle: story.profileHandle, profileName: story.profileName, profileImageUrl: story.profileImageUrl, city: story.city, stories: [story] });
  }
  return [...groups.values()].map((group) => ({ ...group, stories: [...group.stories].sort((first, second) => first.createdAt.localeCompare(second.createdAt)) }));
}

function StoryViewer({ group, startAt, onClose, onViewed }: { group: StoryGroup; startAt: number; onClose: () => void; onViewed?: (storyId: string) => void }) {
  const [index, setIndex] = useState(startAt);
  const story = group.stories[index];

  useEffect(() => {
    onViewed?.(story.id);
  }, [onViewed, story.id]);

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
      <a className="story-viewer-profile-link" href={profileHref(group)}>Ver perfil público de {group.profileName}</a>
      <div className={`story-viewer-content story-viewer-${story.storyType}`}>{story.storyType === "image" && story.imageUrl ? <img src={story.imageUrl} alt={`Historia de ${group.profileName}`} /> : <p>{story.body}</p>}{story.storyType === "image" && story.body && <span>{story.body}</span>}</div>
      <button className="story-viewer-previous" type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} aria-label="Historia anterior">‹</button>
      <button className="story-viewer-next" type="button" onClick={() => index < group.stories.length - 1 ? setIndex((value) => value + 1) : onClose()} aria-label="Historia siguiente">›</button>
    </div>
  </div>;
}

function StoryActivityPanel({ stories }: { stories: PublicStory[] }) {
  const activity = useMemo(() => [...stories].filter((story) => story.storyType === "text" && story.body.trim()).sort((first, second) => second.createdAt.localeCompare(first.createdAt)).slice(0, 8), [stories]);
  if (!activity.length) return null;
  return <aside className="story-activity-panel" aria-label="Última actividad">
    <header><h2>Última actividad</h2><span>24 h</span></header>
    <div>{activity.map((story) => <a href={profileHref(story)} key={story.id} className="story-activity-item"><span className="story-activity-avatar">{story.profileImageUrl ? <img src={story.profileImageUrl} alt="" /> : story.profileName.slice(0, 1)}</span><span><strong>{story.profileName}</strong><small>{story.city} · {activityTimeLabel(story.createdAt)}</small><p>{story.body}</p></span></a>)}</div>
  </aside>;
}

export function StoryRail({ stories, city, profileOnly = false, withActivity = false }: StoryRailProps) {
  const groups = useMemo(() => groupStories(stories), [stories]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [open, setOpen] = useState<{ group: StoryGroup; index: number } | null>(null);

  useEffect(() => {
    const loadStoredViews = window.setTimeout(() => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(seenStorageKey) ?? "[]");
        if (Array.isArray(stored)) setSeenIds(stored.filter((value): value is string => typeof value === "string").slice(-500));
      } catch {
        // A broken or unavailable local storage entry should never block stories.
      }
    }, 0);
    return () => window.clearTimeout(loadStoredViews);
  }, []);

  const orderedGroups = useMemo(() => {
    const seen = new Set(seenIds);
    return [...groups].sort((first, second) => {
      const firstHasNew = first.stories.some((story) => !seen.has(story.id));
      const secondHasNew = second.stories.some((story) => !seen.has(story.id));
      if (firstHasNew !== secondHasNew) return firstHasNew ? -1 : 1;
      const firstLatest = first.stories.at(-1)?.createdAt ?? "";
      const secondLatest = second.stories.at(-1)?.createdAt ?? "";
      return secondLatest.localeCompare(firstLatest);
    });
  }, [groups, seenIds]);

  const markStorySeen = useCallback((storyId: string) => {
    setSeenIds((current) => {
      if (current.includes(storyId)) return current;
      const next = [...current, storyId].slice(-500);
      try { window.localStorage.setItem(seenStorageKey, JSON.stringify(next)); } catch { /* Browsing remains available without storage. */ }
      return next;
    });
  }, []);

  function openGroup(group: StoryGroup) {
    setOpen({ group, index: 0 });
  }

  if (!groups.length) return null;
  const title = profileOnly ? "Historias activas" : city ? `Historias en ${city}` : "Actualizaciones de Chile";
  const description = profileOnly ? "Actualizaciones visibles durante 24 horas." : city ? `Actualizaciones de publicaciones en ${city}, visibles con o sin cuenta durante 24 horas.` : "Historias recientes del directorio nacional, visibles con o sin cuenta.";
  const rail = <section className={`story-rail${profileOnly ? " story-rail-profile" : ""}`} aria-label={title}>
    <div className="story-rail-heading"><div><p className="eyebrow">ACTUALIZACIONES · 24 HORAS</p><h2>{title}</h2></div><p>{description}</p></div>
    <div className="story-bubble-list">{orderedGroups.map((group) => {
      const cover = [...group.stories].reverse().find((story) => story.storyType === "image");
      const avatar = cover?.imageUrl ?? group.profileImageUrl;
      return <div className="story-bubble-card" key={group.profileId}><button className="story-bubble" type="button" onClick={() => openGroup(group)} aria-label={`Ver historias de ${group.profileName}`}><span className={`story-bubble-avatar${avatar ? " has-image" : ""}`}>{avatar ? <img src={avatar} alt="" /> : group.profileName.slice(0, 1)}</span><strong>{group.profileName}</strong>{!profileOnly && <small>{group.city}</small>}</button>{!profileOnly && <a href={profileHref(group)} className="story-profile-link">Ver perfil</a>}</div>;
    })}</div>
    {open && <StoryViewer group={open.group} startAt={open.index} onClose={() => setOpen(null)} onViewed={markStorySeen} />}
  </section>;

  const hasActivity = stories.some((story) => story.storyType === "text" && story.body.trim());
  if (!withActivity || !hasActivity) return rail;
  return <div className="directory-story-context">{rail}<StoryActivityPanel stories={stories} /></div>;
}

export function ProfileStoryTrigger({ stories }: { stories: PublicStory[] }) {
  const groups = useMemo(() => groupStories(stories), [stories]);
  const [open, setOpen] = useState(false);
  const group = groups[0];
  if (!group) return null;
  return <><button className="profile-story-trigger" type="button" onClick={() => setOpen(true)} aria-label={`Ver historias de ${group.profileName}`}><span>Ver historias</span></button>{open && <StoryViewer group={group} startAt={0} onClose={() => setOpen(false)} />}</>;
}
