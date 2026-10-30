import { assertImageSource, isImageSource } from "./image-upload-policy";
import { assertVideoSource, isVideoSource } from "./video-policy";

/** Source validation only. Picker and drop use this same bounded selection;
 * preparation and server-side byte/signature checks still run before storage. */
export function selectGalleryFiles<T extends { name: string; type: string; size: number }>(files: readonly T[], options: {
  kind?: "image" | "video";
  imageCount: number;
  videoCount: number;
  imageLimit: number;
  videoLimit: number;
}) {
  const selected: { file: T; image: boolean }[] = [], errors: string[] = [];
  let images = options.imageCount, videos = options.videoCount;
  for (const file of files) {
    try {
      const image = isImageSource(file), video = !image && isVideoSource(file);
      if (!image && !video) throw new Error("Formato no admitido. Elige fotos JPEG, PNG, WebP o HEIC compatible, o videos MP4/WebM/MOV.");
      if (options.kind && (options.kind === "image") !== image) throw new Error(`Elige ${options.kind === "image" ? "solo fotos en esta sección; los videos se agregan abajo" : "solo videos en esta sección; las fotos se agregan arriba"}.`);
      if (image) {
        assertImageSource(file.size);
        if (images >= options.imageLimit) throw new Error(`Ya alcanzaste el máximo de ${options.imageLimit} fotos entre guardadas y seleccionadas. Quita una antes de agregar otra.`);
        images += 1;
      } else {
        assertVideoSource(file.size);
        if (videos >= options.videoLimit) throw new Error(`Ya alcanzaste el máximo de ${options.videoLimit} videos entre guardados y seleccionados. Quita uno antes de agregar otro.`);
        videos += 1;
      }
      selected.push({ file, image });
    } catch (cause) { errors.push(`${file.name}: ${cause instanceof Error ? cause.message : "No se pudo seleccionar el archivo."}`); }
  }
  return { selected, errors };
}
