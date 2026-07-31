export type StoryType = "text" | "image";
export const MAX_STORY_TEXT_LENGTH = 180;
export const MAX_STORY_IMAGE_BYTES = 2_000_000;

export function storyExpiresAt() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export function storyTimeLabel(expiresAt: string, now = new Date()) {
  const minutes = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 60_000));
  if (minutes >= 60) return `Disponible ${Math.ceil(minutes / 60)} h más`;
  return `Disponible ${minutes} min más`;
}
