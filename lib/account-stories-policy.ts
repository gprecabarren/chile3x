export type StoryAvailability = { status: string; ownerHiddenAt: string | null };

export function canPublishAccountStories(profile: StoryAvailability) {
  return profile.status === "approved" && !profile.ownerHiddenAt;
}

export function accountStoryUnavailableReason(profile: StoryAvailability) {
  if (profile.status !== "approved") return "No disponible para subir historias: este anuncio todavía no está aprobado y publicado.";
  if (profile.ownerHiddenAt) return "No disponible para subir historias: este anuncio está oculto por ti. Vuelve a mostrarlo para publicar.";
  return null;
}

export function availableStoryProfilesFirst<T extends StoryAvailability>(profiles: T[]) {
  return [...profiles].sort((a, b) => Number(canPublishAccountStories(b)) - Number(canPublishAccountStories(a)));
}
