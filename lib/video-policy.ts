export const MAX_VIDEO_SOURCE_BYTES = 50_000_000;
export const MAX_PREPARED_VIDEO_BYTES = 12_000_000;
export const MAX_VIDEO_SECONDS = 15;
// One or two timestamp ticks can extend an otherwise exact 15-second clip.
export const VIDEO_DURATION_TOLERANCE = 0.05;
export const VIDEO_INPUT_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v";
export const VIDEO_UPLOAD_RULES = `Videos MP4, WebM o MOV (iPhone/Android): originales de hasta 50 MB; el resultado final admite hasta ${MAX_VIDEO_SECONDS} segundos. En la galería puedes elegir el inicio y el final antes de subir. Se preparan en tu dispositivo; solo se sube la versión final de hasta ${MAX_PREPARED_VIDEO_BYTES / 1_000_000} MB. Mantén esta pestaña abierta. Si tu navegador no puede leer HEVC, exporta desde Fotos/Galería como MP4/H.264 (Más compatible).`;
export const VIDEO_CODEC_HELP = "Este navegador no puede convertir el códec de este video. Intenta subirlo desde Safari actualizado en tu iPhone o grábalo en Cámara > Formatos > Más compatible (H.264). En Android, desactiva video de alta eficiencia/HEVC. No se ha subido ningún archivo.";

export function isVideoSource(file: Pick<File, "name" | "type">) {
  return ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"].includes(file.type.toLowerCase())
    || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export function assertVideoSource(size: number, duration?: number) {
  if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_SOURCE_BYTES) throw new Error(`El video original debe pesar 50 MB o menos.${Number.isFinite(size) && size > 0 ? ` Este pesa ${(size / 1_000_000).toFixed(1)} MB.` : " El archivo está vacío o no se pudo leer."}`);
  if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS + VIDEO_DURATION_TOLERANCE)) throw new Error(`Los videos deben durar ${MAX_VIDEO_SECONDS} segundos o menos.${Number.isFinite(duration) && duration > 0 ? ` Este dura ${duration.toFixed(2)} segundos.` : " No se pudo leer una duración válida."} Recórtalo en Fotos o Galería antes de elegirlo.`);
}

export function videoOutputSize(width: number, height: number) {
  if (![width, height].every(value => Number.isFinite(value) && value >= 2 && value <= 8192) || width * height > 16_777_216) throw new Error("Elige un video de hasta 4K para prepararlo en este dispositivo.");
  const scale = Math.min(1, 1280 / width, 1280 / height, Math.sqrt(921600 / (width * height)));
  return { width: Math.max(2, Math.floor(width * scale / 2) * 2), height: Math.max(2, Math.floor(height * scale / 2) * 2) };
}

/** Leave room for audio/container overhead; 12 MB is a ceiling, not a target. */
export function videoEncodingBitrate(width: number, height: number, duration: number) {
  const sizeBudget = MAX_PREPARED_VIDEO_BYTES * 0.85 * 8 / Math.max(1, duration) - 128_000;
  return Math.floor(Math.min(sizeBudget, Math.max(600_000, Math.min(4_000_000, width * height / 921600 * 4_000_000))));
}
