export const PROFILE_TAG_COMBINATION_MESSAGE = "La etiqueta MILF no se puede combinar con Hombres ni con Trans. Elige las etiquetas que correspondan al anuncio.";
export function incompatibleProfileTags(tags:readonly string[]) { return tags.includes("milf")&&(tags.includes("hombres")||tags.includes("trans")); }
