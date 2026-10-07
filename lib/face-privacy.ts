export type FacePrivacyRegion = { x: number; y: number; width: number; height: number };
export const MAX_PRIVACY_REGIONS = 10;

export function validPrivacyRegions(regions: readonly FacePrivacyRegion[]) {
  return regions.length <= MAX_PRIVACY_REGIONS && regions.every(region =>
    [region.x, region.y, region.width, region.height].every(Number.isFinite)
    && region.x >= 0 && region.y >= 0 && region.width >= .01 && region.height >= .01
    && region.x + region.width <= 1.000001 && region.y + region.height <= 1.000001);
}
