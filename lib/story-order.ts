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
