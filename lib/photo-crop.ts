export type PhotoCrop = { zoom: number; horizontal: number; vertical: number; ratio: "original" | "square" | "portrait" | "landscape"; maxDimension: number };
export const defaultPhotoCrop: PhotoCrop = { zoom: 1, horizontal: 50, vertical: 50, ratio: "original", maxDimension: 2200 };

/** Pixel bounds are always inside the source; output never invents resolution. */
export function photoCropBounds(width: number, height: number, crop: PhotoCrop) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error("Dimensiones de foto no válidas.");
  if (![crop.zoom, crop.horizontal, crop.vertical, crop.maxDimension].every(Number.isFinite) || crop.zoom < 1 || crop.zoom > 4 || crop.horizontal < 0 || crop.horizontal > 100 || crop.vertical < 0 || crop.vertical > 100 || crop.maxDimension < 320 || crop.maxDimension > 2200) throw new Error("Ajustes de recorte no válidos.");
  const ratio = { original: width / height, square: 1, portrait: 4 / 5, landscape: 16 / 9 }[crop.ratio];
  if (!ratio) throw new Error("Formato de recorte no válido.");
  const cropWidth = Math.max(1, Math.floor(Math.min(width, height * ratio) / crop.zoom));
  const cropHeight = Math.max(1, Math.floor(Math.min(height, width / ratio) / crop.zoom));
  const x = Math.round((width - cropWidth) * crop.horizontal / 100);
  const y = Math.round((height - cropHeight) * crop.vertical / 100);
  const scale = Math.min(1, crop.maxDimension / Math.max(cropWidth, cropHeight));
  return { x, y, width: cropWidth, height: cropHeight, outputWidth: Math.max(1, Math.round(cropWidth * scale)), outputHeight: Math.max(1, Math.round(cropHeight * scale)) };
}
