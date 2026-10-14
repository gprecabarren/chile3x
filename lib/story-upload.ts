import { detectImageType, detectVideoType, extensionForImageType, extensionForVideoType } from "@/lib/media";
import { MAX_STORY_IMAGE_BYTES, MAX_STORY_TEXT_LENGTH, type StoryType } from "@/lib/story-data";
import { MAX_PREPARED_VIDEO_BYTES } from "@/lib/video-policy";
import { validatePreparedVideo } from "@/lib/video-validation";

export class StoryUploadError extends Error { constructor(message: string, public status = 400) { super(message); } }
export async function readStoryUpload(form: FormData) {
  const body = typeof form.get("body") === "string" ? String(form.get("body")).trim() : "";
  if (body.length > MAX_STORY_TEXT_LENGTH) throw new StoryUploadError(`El texto admite hasta ${MAX_STORY_TEXT_LENGTH} caracteres.`);
  const image = form.get("image"); const video = form.get("video");
  const hasImage = image instanceof File && image.size > 0; const hasVideo = video instanceof File && video.size > 0;
  if (hasImage && hasVideo) throw new StoryUploadError("Publica una foto o un video por historia, no ambos archivos a la vez.");
  const file = hasVideo ? video : hasImage ? image : null;
  const storyType: StoryType = hasVideo ? "video" : hasImage ? "image" : "text";
  if (!file) {
    if (image instanceof File || video instanceof File) throw new StoryUploadError("El archivo está vacío. Descarga el original a tu dispositivo y vuelve a seleccionarlo.");
    if (body.length < 2) throw new StoryUploadError("Escribe un estado de texto de al menos 2 caracteres.");
    return { body, storyType, data: null, contentType: null, extension: null };
  }
  const maxBytes = hasVideo ? MAX_PREPARED_VIDEO_BYTES : MAX_STORY_IMAGE_BYTES;
  if (file.size > maxBytes) throw new StoryUploadError(`El archivo final supera ${maxBytes / 1_000_000} MB. Vuelve a prepararlo desde el formulario.`, 413);
  const data = await file.arrayBuffer();
  if (hasVideo) {
    const contentType = detectVideoType(data);
    if (!contentType) throw new StoryUploadError("El video no es un MP4/H.264 o WebM válido. Vuelve a prepararlo; no se guardó el original.");
    try { await validatePreparedVideo(data, contentType); } catch (error) { throw new StoryUploadError(error instanceof Error ? error.message : "No se pudo validar la duración y formato del video."); }
    return { body, storyType, data, contentType, extension: extensionForVideoType(contentType) };
  }
  const contentType = detectImageType(data);
  if (!contentType) throw new StoryUploadError("La foto no es un JPEG, PNG o WebP válido. Exporta una copia en uno de esos formatos o prepárala desde el formulario.");
  return { body, storyType, data, contentType, extension: extensionForImageType(contentType) };
}
