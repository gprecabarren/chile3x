export type GalleryPhotoOption = "watermark" | "blurFaces";

type PhotoCandidate = { image: boolean; status: string; watermark: boolean; blurFaces: boolean; prepared?: unknown; detail: string };

// Keep edits and manual privacy regions. Only invalidate the processed copy;
// completed uploads and videos must never be changed by the global controls.
export function applyPhotoOptionToSelection<T extends PhotoCandidate>(candidates: readonly T[], option: GalleryPhotoOption, enabled: boolean): T[] {
  return candidates.map(candidate => !candidate.image || candidate.status === "completed" || candidate[option] === enabled
    ? candidate
    : { ...candidate, [option]: enabled, prepared: undefined, status: "ready", detail: "Opciones actualizadas. Revisa el resultado antes de subir." });
}
