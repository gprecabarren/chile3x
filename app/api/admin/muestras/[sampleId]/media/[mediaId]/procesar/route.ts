import { expectedVersion } from "@/lib/collaboration";
import { recordAdminAudit } from "@/lib/admin-audit";
import { MAX_IMAGE_BYTES } from "@/lib/media";
import { readMediaUploadForm } from "@/lib/media-upload-form";
import { parsePhotoEditOptions } from "@/lib/photo-edit-policy";
import { processSamplePhoto, samplePhotoSource, samplePhotoState, SampleMediaError } from "@/lib/private-sample-media";
import { sampleMediaHeaders, sampleMediaRequest } from "@/lib/private-sample-media-http";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ sampleId: string; mediaId: string }> };

export async function GET(request: Request, { params }: Params) {
  return sampleMediaRequest(request, async () => {
    const { sampleId, mediaId } = await params;
    if (new URL(request.url).searchParams.get("source") === "1") {
      const source = await samplePhotoSource(sampleId, mediaId);
      return new Response(source.body, { headers: { ...sampleMediaHeaders, "content-type": source.contentType, "content-length": String(source.size) } });
    }
    return Response.json(await samplePhotoState(sampleId, mediaId), { headers: sampleMediaHeaders });
  });
}

export async function POST(request: Request, { params }: Params) {
  return sampleMediaRequest(request, async admin => {
    const { sampleId, mediaId } = await params, form = await readMediaUploadForm(request, MAX_IMAGE_BYTES);
    const file = form.get("file"), options = parsePhotoEditOptions(form.get("options"));
    if (!options) throw new SampleMediaError("Opciones de privacidad no válidas.");
    if (!(file instanceof File) || form.has("original_file")) throw new SampleMediaError("Envía solo la foto final para guardar.");
    const result = await processSamplePhoto({ sampleId, mediaId, file, options, version: expectedVersion(form, `sample:${sampleId}`), actorId: admin.id });
    await recordAdminAudit(admin, { category: "media", action: "sample.process_photo", entityType: "sample", entityId: sampleId, entityLabel: "Edición de foto privada", summary: "Editó una foto de una muestra privada.", after: { sampleId, mediaId, watermark: options.watermark, blur: options.blur, additionalOriginalStored: false } });
    return Response.json(result, { headers: sampleMediaHeaders });
  });
}
