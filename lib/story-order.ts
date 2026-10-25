// Historical SQLite timestamps are UTC even without an explicit zone.
export function storyTimestamp(value: string) {
  return Date.parse(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}
export function chronologicalStories<T extends { id: string; createdAt: string }>(stories: T[]) {
  return [...stories].sort((a, b) => storyTimestamp(a.createdAt) - storyTimestamp(b.createdAt) || a.id.localeCompare(b.id));
}
export function activeStories<T extends { expiresAt: string }>(stories: T[], now: number) {
  return stories.filter((story) => storyTimestamp(story.expiresAt) > now);
}
export function newestStories<T extends { id: string; createdAt: string }>(stories: T[]) {
  return chronologicalStories(stories).reverse();
}
const uploadedFormatter = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function storyUploadLabel(value: string) {
  const timestamp = storyTimestamp(value);
  return Number.isFinite(timestamp) ? uploadedFormatter.format(timestamp) : "Fecha no disponible";
}

// SSR and the first hydration render use the same fixed publication time.
// Relative labels start only after the shared client clock has mounted.
export function storyActivityLabel(createdAt: string, now: number | null) {
  const timestamp = storyTimestamp(createdAt);
  if (now === null || !Number.isFinite(timestamp)) return storyUploadLabel(createdAt);
  const minutes = Math.max(1, Math.floor((now - timestamp) / 60_000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `hace ${hours} h` : `hace ${Math.floor(hours / 24)} d`;
}
