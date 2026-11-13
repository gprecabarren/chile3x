import { MAX_IMAGES_PER_PROFILE } from "./media-count-limits.ts";

type Photo = {
  mediaType: string;
  isProfilePhoto: boolean;
  moderationStatus: string;
  replacementOf?: string;
};

export function profileGallerySlotsUsed(files: readonly Photo[]) {
  const images = files.filter(file => file.mediaType === "image");
  const hasPendingCover = images.some(file => file.isProfilePhoto && file.moderationStatus === "pending" && !file.replacementOf);
  return images.filter(file => !file.isProfilePhoto || (hasPendingCover && file.moderationStatus === "approved")).length;
}

/** The previous principal needs a gallery slot when a new principal is approved.
 * A pending edit replacing its approved base is a single logical photo. */
export function profilePhotoCapacity(
  files: readonly Photo[],
  kind: "gallery" | "profile_photo",
  limit = MAX_IMAGES_PER_PROFILE,
) {
  if (kind === "profile_photo") {
    const images = files.filter(file => file.mediaType === "image");
    if (images.some(file => file.isProfilePhoto && file.moderationStatus === "pending" && !file.replacementOf))
      return "Ya existe una foto principal pendiente. Revísala, edítala o retírala antes de seleccionar otra principal.";
    if (images.length > limit)
      return "La galería está completa. Retira una foto antes de subir otra principal: la anterior se conservará en la galería.";
  } else if (profileGallerySlotsUsed(files) >= limit) {
    return `La galería alcanzó su máximo de ${limit} fotos, incluido el espacio reservado para la foto principal anterior cuando se apruebe su reemplazo.`;
  }
  return null;
}
