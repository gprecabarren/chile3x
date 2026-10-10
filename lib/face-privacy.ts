export type FacePrivacyRegion = { x: number; y: number; width: number; height: number };
export const MAX_PRIVACY_REGIONS = 10;

export function privacyRegionAtPoint(x: number, y: number): FacePrivacyRegion {
  const width = .22, height = .18;
  return { x: Math.max(0, Math.min(1 - width, x - width / 2)), y: Math.max(0, Math.min(1 - height, y - height / 2)), width, height };
}

export function validPrivacyRegions(regions: readonly FacePrivacyRegion[]) {
  return regions.length <= MAX_PRIVACY_REGIONS && regions.every(region =>
    [region.x, region.y, region.width, region.height].every(Number.isFinite)
    && region.x >= 0 && region.y >= 0 && region.width >= .01 && region.height >= .01
    && region.x + region.width <= 1.000001 && region.y + region.height <= 1.000001);
}
