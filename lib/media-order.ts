export type GalleryKind = "image" | "video";
type OrderedMedia = { id: string; mediaType: string; isProfilePhoto: boolean; visibility?: string };

export function galleryOrderIds(files: readonly OrderedMedia[], kind: GalleryKind) {
  return files.filter(file => file.mediaType === kind && !file.isProfilePhoto && file.visibility !== "exclusive").map(file => file.id);
}

/** A complete permutation of one gallery only; never accept foreign IDs or
 * silently drop a file added by another tab. Principal/exclusive media stay put. */
export function validGalleryOrder(files: readonly OrderedMedia[], kind: unknown, order: unknown): order is string[] {
  if (kind !== "image" && kind !== "video") return false;
  const expected = galleryOrderIds(files, kind);
  return Array.isArray(order) && order.length === expected.length && order.length <= 20 && order.every(id => typeof id === "string") && new Set(order).size === order.length && expected.every(id => order.includes(id));
}

export function applyGalleryOrder<T extends OrderedMedia>(files: readonly T[], kind: GalleryKind, order: string[]): T[] {
  if (!validGalleryOrder(files, kind, order)) throw new Error("El orden no coincide con los archivos actuales. Recarga la galería.");
  const byId = new Map(files.map(file => [file.id, file]));
  let index = 0;
  return files.map(file => file.mediaType === kind && !file.isProfilePhoto && file.visibility !== "exclusive" ? byId.get(order[index++])! : file);
}

export function moveGalleryOrder(files: readonly OrderedMedia[], mediaId: string, direction: -1 | 1): { kind: GalleryKind; order: string[] } | null {
  const selected = files.find(file => file.id === mediaId);
  if (!selected || (selected.mediaType !== "image" && selected.mediaType !== "video")) return null;
  const kind = selected.mediaType, order = galleryOrderIds(files, kind), index = order.indexOf(mediaId), next = index + direction;
  if (index < 0 || next < 0 || next >= order.length) return null;
  [order[index], order[next]] = [order[next], order[index]];
  return { kind, order };
}
