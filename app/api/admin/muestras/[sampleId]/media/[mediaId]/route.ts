import { expectedVersion } from "@/lib/collaboration";
import { recordAdminAudit } from "@/lib/admin-audit";
import { readMediaUploadForm } from "@/lib/media-upload-form";
import { removeSampleMedia, setSampleCover } from "@/lib/private-sample-media";
import { sampleMediaHeaders, sampleMediaRequest } from "@/lib/private-sample-media-http";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ sampleId: string; mediaId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  return sampleMediaRequest(request, async admin => {
    const { sampleId, mediaId } = await params, form = await readMediaUploadForm(request, 8_000, 16_000);
    const result = await removeSampleMedia(sampleId, mediaId, expectedVersion(form, `sample:${sampleId}`), admin.id);
    await recordAdminAudit(admin, { category: "media", action: "sample.remove_media", entityType: "sample", entityId: sampleId, entityLabel: "Medios de muestra privada", summary: "Retiró un archivo de una muestra privada.", before: { sampleId, mediaId } });
    return Response.json(result, { headers: sampleMediaHeaders });
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return sampleMediaRequest(request, async admin => {
    const { sampleId, mediaId } = await params, form = await readMediaUploadForm(request, 8_000, 16_000);
    const result = await setSampleCover(sampleId, mediaId, expectedVersion(form, `sample:${sampleId}`), admin.id);
    await recordAdminAudit(admin, { category: "media", action: "sample.cover", entityType: "sample", entityId: sampleId, entityLabel: "Foto principal de muestra", summary: "Cambió la foto principal de una muestra privada.", after: { sampleId, mediaId } });
    return Response.json(result, { headers: sampleMediaHeaders });
  });
}
