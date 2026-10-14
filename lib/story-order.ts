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
