export const MAX_VIDEO_SOURCE_BYTES = 50_000_000;
export const MAX_PREPARED_VIDEO_BYTES = 8_000_000;
export const MAX_VIDEO_SECONDS = 10;
// One or two timestamp ticks can extend an otherwise exact 10-second clip.
export const VIDEO_DURATION_TOLERANCE = 0.05;
export const VIDEO_INPUT_ACCEPT = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v";
export const VIDEO_UPLOAD_RULES = "Videos MP4, WebM o MOV (iPhone/Android): hasta 10 segundos y 50 MB originales. Se optimizan en tu dispositivo cuando hace falta; solo se sube una versión de hasta 8 MB. Mantén esta pestaña abierta. Si tu navegador no puede leer HEVC, exporta desde Fotos/Galería como MP4/H.264 (Más compatible).";
export const VIDEO_CODEC_HELP = "Este navegador no puede convertir el códec de este video. Intenta subirlo desde Safari actualizado en tu iPhone o grábalo en Cámara > Formatos > Más compatible (H.264). En Android, desactiva video de alta eficiencia/HEVC. No se ha subido ningún archivo.";

export function isVideoSource(file: Pick<File, "name" | "type">) {
  return ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"].includes(file.type.toLowerCase())
    || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export function assertVideoSource(size: number, duration?: number) {
  if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_SOURCE_BYTES) throw new Error("El video original debe pesar 50 MB o menos.");
  if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_SECONDS + VIDEO_DURATION_TOLERANCE)) throw new Error("Los videos deben durar 10 segundos o menos. Recórtalo en Fotos o Galería antes de elegirlo.");
}

export function videoOutputSize(width: number, height: number) {
  if (![width, height].every(value => Number.isFinite(value) && value >= 2 && value <= 8192) || width * height > 16_777_216) throw new Error("Elige un video de hasta 4K para prepararlo en este dispositivo.");
  const scale = Math.min(1, 1280 / width, 1280 / height, Math.sqrt(921600 / (width * height)));
  return { width: Math.max(2, Math.floor(width * scale / 2) * 2), height: Math.max(2, Math.floor(height * scale / 2) * 2) };
}
