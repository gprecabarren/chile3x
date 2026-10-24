import { validPrivacyRegions, type FacePrivacyRegion } from "./face-privacy";

export type PhotoEditOptions = { watermark: boolean; blur: boolean; faceRegions: FacePrivacyRegion[] };
export function readPhotoEditOptions(value: unknown): PhotoEditOptions | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string,unknown>;
  if (typeof data.watermark !== "boolean" || typeof data.blur !== "boolean" || !Array.isArray(data.faceRegions) || data.faceRegions.length > 10) return null;
  const regions: FacePrivacyRegion[] = [];
  for (const item of data.faceRegions) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const r = item as Record<string,unknown>;
    if (![r.x,r.y,r.width,r.height].every(n=>typeof n === "number" && Number.isFinite(n))) return null;
    regions.push({x:r.x as number,y:r.y as number,width:r.width as number,height:r.height as number});
  }
  if (!validPrivacyRegions(regions)) return null;
  return {watermark:data.watermark,blur:data.blur,faceRegions:data.blur ? regions : []};
}
export function parsePhotoEditOptions(value: unknown): PhotoEditOptions | null {
  if (typeof value !== "string" || value.length > 4000) return null;
  try { return readPhotoEditOptions(JSON.parse(value)); } catch { return null; }
}
export function samePhotoEdit(a: PhotoEditOptions,b: PhotoEditOptions) {
  return a.watermark === b.watermark && a.blur === b.blur && JSON.stringify(a.faceRegions) === JSON.stringify(b.faceRegions);
}
