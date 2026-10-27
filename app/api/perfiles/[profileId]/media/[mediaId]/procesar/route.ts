import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { CollaborationConflict, conflictResponse } from "@/lib/collaboration";
import { MAX_IMAGE_BYTES } from "@/lib/media";
import { MediaUploadRequestError, readMediaUploadForm } from "@/lib/media-upload-form";
import { OwnerPhotoEditError, ownerPhotoState, saveOwnerPhoto } from "@/lib/owner-photo-edit";

export const dynamic = "force-dynamic";
const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff" };
type Params = { params: Promise<{ profileId: string; mediaId: string }> };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });
function failure(cause: unknown) {
  if (cause instanceof CollaborationConflict) return conflictResponse();
  if (cause instanceof OwnerPhotoEditError || cause instanceof MediaUploadRequestError) return error(cause.message, cause.status);
  const reference = `FOTO-${crypto.randomUUID().slice(0, 8)}`; console.error("Owner photo edit failed", { reference, cause });
  return error(`No se pudo confirmar la edición. Revisa la foto antes de repetir. Referencia: ${reference}.`, 500);
}
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser(); if (!user) return error("Ingresa para editar tus fotos.", 401);
    const { profileId, mediaId } = await params, state = await ownerPhotoState(profileId, mediaId, user.id, new URL(request.url).searchParams.get("source") === "1");
    if ("body" in state) return new Response(state.body, { headers: { ...headers, "content-type": state.contentType ?? "application/octet-stream", "content-length": String(state.size) } });
    return Response.json(state, { headers });
  } catch (cause) { return failure(cause); }
}
export async function POST(request: Request, { params }: Params) {
  try {
    try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
    const user = await getCurrentUser(); if (!user) return error("Ingresa para editar tus fotos.", 401);
    const { profileId, mediaId } = await params, form = await readMediaUploadForm(request, MAX_IMAGE_BYTES);
    return Response.json(await saveOwnerPhoto(profileId, mediaId, user.id, form), { headers });
  } catch (cause) { return failure(cause); }
}
