"use client";
/* eslint-disable @next/next/no-img-element -- ephemeral R2 stories bypass image optimization intentionally. */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PublicStory } from "@/lib/stories";
import { activeStories, chronologicalStories, storyTimestamp } from "@/lib/story-order";

type StoryRailProps = {
  stories: PublicStory[];
  city?: string;
  profileOnly?: boolean;
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
  const minutes = Math.max(1, Math.floor((now.getTime() - storyTimestamp(createdAt)) / 60_000));
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
  return [...groups.values()].map((group) => ({ ...group, stories: chronologicalStories(group.stories) }));
}

function useActiveStories(stories: PublicStory[]) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 30_000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, []);
  return useMemo(() => now === null ? stories : activeStories(stories, now), [stories, now]);
}

function StoryViewer({ group: initialGroup, startAt, onClose, onViewed }: { group: StoryGroup; startAt: number; onClose: () => void; onViewed?: (storyId: string) => void }) {
  const [group] = useState(initialGroup);
  const [index, setIndex] = useState(startAt);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const story = group.stories[index];
  const ready = story.storyType === "text" || loadedId === story.id;

  useEffect(() => {
    const timeout = window.setTimeout(onClose, Math.max(0, Math.min(...group.stories.map((item) => storyTimestamp(item.expiresAt))) - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [group.stories, onClose]);

  useEffect(() => {
    if (ready) onViewed?.(story.id);
  }, [onViewed, ready, story.id]);

  useEffect(() => {
    if (!ready || paused) return;
    const timeout = window.setTimeout(() => {
      if (index < group.stories.length - 1) setIndex((value) => value + 1);
      else onClose();
    }, story.storyType === "image" ? 6_000 : 7_000);
    return () => window.clearTimeout(timeout);
  }, [group.stories.length, index, onClose, ready, paused, story.id, story.storyType]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const elements = [...(panelRef.current?.querySelectorAll<HTMLElement>("a[href],button:not([disabled])") ?? [])];
      const first = elements[0]; const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    const visibility = () => { if (document.hidden) setPaused(true); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("keydown", trapFocus);
    return () => { document.body.style.overflow = overflow; previous?.focus(); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("keydown", trapFocus); };
  }, []);

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
    <div className="story-viewer-panel" ref={panelRef}>
      <div className="story-viewer-progress" aria-hidden="true">{group.stories.map((item, itemIndex) => <span className={itemIndex <= index ? "is-complete" : ""} key={item.id} />)}</div>
      <header><div><b>{group.profileName}</b><span>{group.city} · {storyTimeLabel(story.expiresAt)}</span></div><button type="button" onClick={onClose} aria-label="Cerrar historia">×</button></header>
      <div className="story-viewer-toolbar"><a className="story-viewer-profile-link" href={profileHref(group)}>Ver anuncio</a><button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused}>{paused ? "Continuar" : "Pausar"}</button><small>{index + 1}/{group.stories.length}</small></div>
      <div className={`story-viewer-content story-viewer-${story.storyType}`}>{story.storyType === "image" && story.imageUrl ? <img key={story.id} src={story.imageUrl} alt={`Historia de ${group.profileName}`} onLoad={() => setLoadedId(story.id)} onError={() => setFailedId(story.id)} /> : <p>{story.body}</p>}{failedId === story.id && <p className="story-image-error" role="status">No se pudo cargar esta foto. Puedes pasar a la siguiente historia.</p>}{story.storyType === "image" && story.body && <span>{story.body}</span>}</div>
      <button className="story-viewer-previous" type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0} aria-label="Historia anterior">‹</button>
      <button className="story-viewer-next" type="button" onClick={() => index < group.stories.length - 1 ? setIndex((value) => value + 1) : onClose()} aria-label="Historia siguiente">›</button>
    </div>
  </div>;
}

function StoryActivityPanel({ stories }: { stories: PublicStory[] }) {
  const [visible, setVisible] = useState(8);
  const activity = useMemo(() => chronologicalStories(stories.filter((story) => story.storyType === "text" && story.body.trim())).reverse(), [stories]);
  if (!activity.length) return null;
  return <aside id="directory-activity" className="story-activity-panel" aria-label="Última actividad">
    <header><h2>Última actividad</h2><span>24 h</span></header>
    <div>{activity.slice(0, visible).map((story) => <a href={profileHref(story)} key={story.id} className="story-activity-item"><span className="story-activity-avatar">{story.profileImageUrl ? <img src={story.profileImageUrl} alt="" loading="lazy" /> : story.profileName.slice(0, 1)}</span><span><strong>{story.profileName}</strong><small>{story.city} · {activityTimeLabel(story.createdAt)}</small><p>{story.body}</p></span></a>)}</div>
    {activity.length > visible && <button className="story-activity-more" type="button" onClick={() => setVisible((value) => value + 8)}>Ver más actividad</button>}
  </aside>;
}

export function StoryRail({ stories, city, profileOnly = false }: StoryRailProps) {
  const active = useActiveStories(stories);
  const groups = useMemo(() => groupStories(profileOnly ? active : active.filter((story) => story.storyType === "image")), [active, profileOnly]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [open, setOpen] = useState<{ group: StoryGroup; index: number } | null>(null);
  const close = useCallback(() => setOpen(null), []);

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
      return storyTimestamp(secondLatest) - storyTimestamp(firstLatest) || first.profileId.localeCompare(second.profileId);
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
    setOpen({ group, index: Math.max(0, group.stories.findIndex((story) => !seenIds.includes(story.id))) });
  }

  if (!groups.length) return null;
  const title = profileOnly ? "Historias activas" : city ? `Historias en ${city}` : "Actualizaciones de Chile";
  const description = profileOnly ? "Actualizaciones visibles durante 24 horas." : city ? `Actualizaciones de publicaciones en ${city}, visibles con o sin cuenta durante 24 horas.` : "Historias recientes del directorio nacional, visibles con o sin cuenta.";
  return <section className={`story-rail story-rail-compact${profileOnly ? " story-rail-profile" : ""}`} aria-label={title}>
    <div className="story-rail-heading"><h2>{title}</h2><span>24 h</span></div><p className="sr-only">{description}</p>
    <div className="story-bubble-list">{orderedGroups.map((group) => {
      const cover = [...group.stories].reverse().find((story) => story.storyType === "image");
      const avatar = cover?.imageUrl ?? group.profileImageUrl;
      const viewed = group.stories.every((story) => seenIds.includes(story.id));
      return <div className="story-bubble-card" key={group.profileId}><button className={`story-bubble${viewed ? " is-viewed" : ""}`} type="button" onClick={() => openGroup(group)} aria-label={`Ver historias de ${group.profileName}${viewed ? ", ya vistas" : ""}`}><span className={`story-bubble-avatar${avatar ? " has-image" : ""}`}>{avatar ? <img src={avatar} alt="" loading="lazy" /> : group.profileName.slice(0, 1)}</span><strong>{group.profileName}</strong>{!profileOnly && !city && <small>{group.city}</small>}</button></div>;
    })}</div>
    {open && <StoryViewer key={open.group.profileId} group={open.group} startAt={open.index} onClose={close} onViewed={markStorySeen} />}
  </section>;
}

export function DirectoryStoryLayout({ stories, city, children }: { stories: PublicStory[]; city?: string; children: ReactNode }) {
  const active = useActiveStories(stories);
  const [activityOpen, setActivityOpen] = useState(false);
  const hasActivity = active.some((story) => story.storyType === "text" && story.body.trim());
  return <div className={`directory-stories-layout${hasActivity ? " has-activity" : ""}${activityOpen && hasActivity ? " is-activity-open" : ""}`}>
    <StoryRail stories={active} city={city} />
    {hasActivity && <div className="directory-activity-tabs" role="group" aria-label="Vista del directorio"><button type="button" aria-pressed={!activityOpen} aria-controls="directory-listings" onClick={() => setActivityOpen(false)}>▦ Anuncios</button><button type="button" aria-pressed={activityOpen} aria-controls="directory-activity" onClick={() => setActivityOpen(true)}>◷ Actividad</button></div>}
    <div className="directory-live-layout"><div id="directory-listings" className="directory-main-results">{children}</div>{hasActivity && <StoryActivityPanel stories={active} />}</div>
  </div>;
}

export function ProfileStoryTrigger({ stories }: { stories: PublicStory[] }) {
  const active = useActiveStories(stories);
  const groups = useMemo(() => groupStories(active), [active]);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const group = groups[0];
  if (!group) return null;
  return <><button className="profile-story-trigger" type="button" onClick={() => setOpen(true)} aria-label={`Ver historias de ${group.profileName}`}><span>Ver historias</span></button>{open && <StoryViewer group={group} startAt={0} onClose={close} />}</>;
}
