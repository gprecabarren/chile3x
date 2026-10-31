type Photo = {
  mediaType: string;
  isProfilePhoto: boolean;
  moderationStatus: string;
  replacementOf?: string;
};
/** The previous principal needs a gallery slot when a new principal is approved.
 * A pending edit replacing its approved base is a single logical photo. */
export function profilePhotoCapacity(
  files: readonly Photo[],
  kind: "gallery" | "profile_photo",
  limit = 10,
) {
  const images = files.filter((file) => file.mediaType === "image"),
    gallery = images.filter((file) => !file.isProfilePhoto);
  const pending = images.filter(
    (file) =>
      file.isProfilePhoto &&
      file.moderationStatus === "pending" &&
      !file.replacementOf,
  );
  const approved = images.filter(
    (file) => file.isProfilePhoto && file.moderationStatus === "approved",
  );
  if (kind === "profile_photo") {
    if (pending.length)
      return "Ya existe una foto principal pendiente. Revísala, edítala o retírala antes de seleccionar otra principal.";
    if (images.length > limit)
      return "La galería está completa. Retira una foto antes de subir otra principal: la anterior se conservará en la galería.";
  } else if (
    gallery.length +
      (pending.length && approved.length ? approved.length : 0) >=
    limit
  ) {
    return "La galería alcanzó su máximo de 10 fotos, incluido el espacio reservado para la foto principal anterior cuando se apruebe su reemplazo.";
  }
  return null;
}
