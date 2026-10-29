export type GalleryMediaOption = "watermark" | "blurFaces";

type MediaCandidate = { image: boolean; status: string; watermark: boolean; blurFaces: boolean; prepared?: unknown; detail: string; file: unknown; originalFile: unknown };

/** Watermarks apply to both formats. Always re-encode videos from their original,
 * keeping the selected trim; never burn a second mark into a prepared preview. */
export function applyMediaOptionToSelection<T extends MediaCandidate>(candidates: readonly T[], option: GalleryMediaOption, enabled: boolean, scope: "all" | "video" = "all"): T[] {
  return candidates.map(candidate => candidate.status === "completed" || candidate[option] === enabled || (scope === "video" && candidate.image) || (option === "blurFaces" && !candidate.image)
    ? candidate
    : { ...candidate, [option]: enabled, file: candidate.image ? candidate.file : candidate.originalFile, prepared: undefined, status: "ready", detail: "Opciones actualizadas. Revisa el resultado antes de subir." });
}
