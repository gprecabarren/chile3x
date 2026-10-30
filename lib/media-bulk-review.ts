// A bounded snapshot binds the approval to the exact files shown to the reviewer.
export const MAX_BULK_MEDIA = 20;
export const MAX_EXCLUSIVE_BULK_MEDIA = 24; // 20 photos and 4 videos per library.
export type ReviewableMedia = {
  id: string; r2Key: string; byteSize: number; createdAt: string;
  moderationStatus: string; isProfilePhoto: boolean; visibility: string;
};
export type MediaReviewSnapshot = { id: string; version: string };

export async function mediaReviewVersion(file: ReviewableMedia) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([
    file.id, file.r2Key, file.byteSize, file.createdAt, file.moderationStatus, file.isProfilePhoto,
  ])));
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

export async function mediaReviewSnapshot(files: readonly ReviewableMedia[]): Promise<MediaReviewSnapshot[]> {
  return Promise.all(files.map(async file => ({ id: file.id, version: await mediaReviewVersion(file) })));
}

export function parseMediaReviewSnapshot(value: FormDataEntryValue | null, limit = MAX_BULK_MEDIA): MediaReviewSnapshot[] | null {
  if (typeof value !== "string" || value.length > 16_000) return null;
  try {
    const entries: unknown = JSON.parse(value);
    if (!Array.isArray(entries) || !entries.length || entries.length > Math.min(limit, MAX_EXCLUSIVE_BULK_MEDIA)) return null;
    const ids = new Set<string>();
    for (const entry of entries) {
      if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || !/^[\w-]{1,100}$/.test(entry.id)
        || typeof entry.version !== "string" || !/^[a-f0-9]{64}$/.test(entry.version) || ids.has(entry.id)) return null;
      ids.add(entry.id);
    }
    return entries;
  } catch { return null; }
}

export function bulkMediaReturnTo(value: FormDataEntryValue | null, profileId: string) {
  const fallback = `/admin/medios?perfil=${encodeURIComponent(profileId)}`;
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const url = new URL(value, "https://chile3x.cl");
    if (url.origin !== "https://chile3x.cl") return fallback;
    const id = encodeURIComponent(profileId);
    const editor = url.pathname === `/admin/anuncios-publicaciones/${id}/editar`
      || url.pathname.match(/^\/admin\/cuentas\/[\w-]+\/perfiles\/([\w-]+)\/medios$/)?.[1] === profileId;
    return editor || url.pathname === "/admin/medios" || /^\/perfil\/[^/]+$/.test(url.pathname) ? `${url.pathname}${url.search}` : fallback;
  } catch { return fallback; }
}

export const bulkMediaMessages: Record<string, string> = {
  exclusive_approved: "Los archivos exclusivos revisados fueron aprobados. Siguen siendo privados y solo accesibles para cuentas autorizadas.",
  approved: "Los archivos revisados fueron aprobados. El anuncio mantiene su estado de publicación.",
  unchanged: "Estos archivos ya estaban aprobados. No se hicieron cambios.",
  changed: "Algún archivo cambió desde que abriste la página. Revisa los archivos actualizados y vuelve a intentarlo.",
  unapproved: "El archivo volvió a revisión. Se conserva para administración y su titular; deja de mostrarse al público.",
};
