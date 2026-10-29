import { expectedVersion } from "@/lib/collaboration";
import { recordAdminAudit } from "@/lib/admin-audit";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/media";
import { readMediaUploadForm } from "@/lib/media-upload-form";
import { parsePhotoEditOptions } from "@/lib/photo-edit-policy";
import { reorderSampleMedia, SampleMediaError, uploadSampleMedia } from "@/lib/private-sample-media";
import { sampleMediaHeaders, sampleMediaRequest } from "@/lib/private-sample-media-http";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ sampleId: string }> }) {
  return sampleMediaRequest(request, async admin => {
    const { sampleId } = await params;
    const form = await readMediaUploadForm(request, Math.max(MAX_IMAGE_BYTES, MAX_VIDEO_BYTES));
    const file = form.get("file"), processing = parsePhotoEditOptions(form.get("processing"));
    if (!(file instanceof File)) throw new SampleMediaError("Selecciona la foto o video para subir.");
    if (form.has("original_file") || (form.has("processing") && !processing)) throw new SampleMediaError("Envía solo el archivo final y opciones válidas.");
    const uploadKind = form.get("upload_kind") === "profile_photo" ? "profile_photo" : "gallery";
    const result = await uploadSampleMedia({ sampleId, file, uploadKind, actorId: admin.id, version: expectedVersion(form, `sample:${sampleId}`), ...(processing ? { processing } : {}) });
    await recordAdminAudit(admin, { category: "media", action: "sample.upload", entityType: "sample", entityId: sampleId, entityLabel: "Medios de muestra privada", summary: `Subió ${uploadKind === "profile_photo" ? "una foto principal" : result.media.mediaType === "image" ? "una foto" : "un video"} a una muestra privada.`, after: { sampleId, mediaId: result.media.id, mediaType: result.media.mediaType, byteSize: result.media.byteSize, uploadKind, private: true, processing } });
    return Response.json(result, { status: 201, headers: sampleMediaHeaders });
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ sampleId: string }> }) {
  return sampleMediaRequest(request, async admin => {
    const { sampleId } = await params, form = await readMediaUploadForm(request, 16_000, 32_000);
    let order: unknown;
    try { order = JSON.parse(String(form.get("order") ?? "")); }
    catch { throw new SampleMediaError("El orden de los archivos no es válido."); }
    const result = await reorderSampleMedia(sampleId, order, expectedVersion(form, `sample:${sampleId}`), admin.id, form.has("kind") ? form.get("kind") : undefined);
    await recordAdminAudit(admin, { category: "media", action: "sample.reorder_media", entityType: "sample", entityId: sampleId, entityLabel: "Orden de medios privados", summary: "Cambió el orden de los archivos de una muestra privada.", after: { sampleId, order: result.order } });
    return Response.json(result, { headers: sampleMediaHeaders });
  });
}
