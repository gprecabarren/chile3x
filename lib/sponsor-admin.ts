import { detectImageType, extensionForImageType, MAX_IMAGE_BYTES } from "@/lib/media";

export type StoredSponsorImage = {
  r2Key: string;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  byteSize: number;
};

export function readSponsorText(form: FormData, key: string, maximum: number) {
  const value = form.get(key);
  return typeof value === "string" && value.length <= maximum ? value.trim() : null;
}

export async function storeSponsorImage(
  file: FormDataEntryValue | null,
  sponsorId: string,
  kind: "background" | "logo",
  adminId: string,
): Promise<StoredSponsorImage | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES) throw new Error("La imagen supera el máximo de 5 MB.");
  const bytes = await file.arrayBuffer();
  const contentType = detectImageType(bytes);
  if (!contentType) throw new Error("La imagen debe ser JPEG, PNG o WebP válida.");
  const { env } = await import("cloudflare:workers");
  if (!env.MEDIA) throw new Error("R2 no está disponible.");
  const r2Key = `sponsors/${sponsorId}/${kind}-${crypto.randomUUID()}.${extensionForImageType(contentType)}`;
  await env.MEDIA.put(r2Key, bytes, {
    httpMetadata: {
      contentType,
      contentDisposition: "inline",
      cacheControl: "public, max-age=86400",
    },
    customMetadata: { uploadedBy: adminId, purpose: `sponsor-${kind}` },
  });
  return { r2Key, contentType, byteSize: bytes.byteLength };
}

export async function deleteSponsorImages(keys: Array<string | null | undefined>) {
  const safeKeys = [...new Set(keys.filter((key): key is string => Boolean(key?.startsWith("sponsors/"))))];
  if (!safeKeys.length) return;
  const { env } = await import("cloudflare:workers");
  if (env.MEDIA) await env.MEDIA.delete(safeKeys);
}
