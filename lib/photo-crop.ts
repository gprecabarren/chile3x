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

export type CropCorner = "nw" | "ne" | "sw" | "se";
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function movePhotoCrop(width: number, height: number, crop: PhotoCrop, dx: number, dy: number): PhotoCrop {
  if (![dx, dy].every(Number.isFinite)) return crop;
  const bounds = photoCropBounds(width, height, crop);
  return { ...crop,
    horizontal: width === bounds.width ? 50 : clamp((bounds.x + dx) / (width - bounds.width) * 100, 0, 100),
    vertical: height === bounds.height ? 50 : clamp((bounds.y + dy) / (height - bounds.height) * 100, 0, 100),
  };
}

/** Resize from a corner, keeping the opposite corner anchored and the ratio. */
export function resizePhotoCrop(width: number, height: number, crop: PhotoCrop, corner: CropCorner, dx: number, dy: number): PhotoCrop {
  if (![dx, dy].every(Number.isFinite)) return crop;
  const bounds = photoCropBounds(width, height, crop);
  const base = photoCropBounds(width, height, { ...crop, zoom: 1 });
  const left = corner.endsWith("w"), top = corner.startsWith("n");
  const anchorX = left ? bounds.x + bounds.width : bounds.x;
  const anchorY = top ? bounds.y + bounds.height : bounds.y;
  const ratio = base.width / base.height;
  const desired = bounds.width + (Math.abs(dx) >= Math.abs(dy * ratio) ? (left ? -dx : dx) : (top ? -dy : dy) * ratio);
  const availableWidth = Math.min(left ? anchorX : width - anchorX, (top ? anchorY : height - anchorY) * ratio, base.width);
  const cropWidth = clamp(desired, base.width / 4, availableWidth);
  const zoom = clamp(base.width / cropWidth, 1, 4);
  const next = photoCropBounds(width, height, { ...crop, zoom });
  const x = left ? anchorX - next.width : anchorX;
  const y = top ? anchorY - next.height : anchorY;
  return { ...crop, zoom, horizontal: width === next.width ? 50 : clamp(x / (width - next.width) * 100, 0, 100), vertical: height === next.height ? 50 : clamp(y / (height - next.height) * 100, 0, 100) };
}
