export const PROFILE_TAG_COMBINATION_MESSAGE = "La etiqueta MILF no se puede combinar con el género Masculino (Hombres) ni con la etiqueta Trans. Revisa el género y las etiquetas del anuncio.";
export function incompatibleProfileTags(tags:readonly string[]) { return tags.includes("milf")&&(tags.includes("hombres")||tags.includes("trans")); }

/** Hombres is derived from the validated Escort gender, including on edits. */
export function profileTagsForGender(tags: readonly string[], gender: string) {
  const normalized = [...new Set(tags.filter(tag => tag !== "hombres"))];
  if (gender === "Masculino") normalized.push("hombres");
  return normalized;
}
