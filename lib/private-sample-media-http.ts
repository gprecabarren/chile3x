import { assertSameOrigin, getCurrentAdmin, type AdminUser } from "@/lib/auth";
import { canManageSamples } from "@/lib/private-samples";
import { CollaborationConflict, CONFLICT_MESSAGE } from "@/lib/collaboration";
import { MediaUploadRequestError } from "@/lib/media-upload-form";
import { SampleMediaError } from "@/lib/private-sample-media";

export const sampleMediaHeaders = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow, noarchive, noimageindex",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cross-origin-resource-policy": "same-origin",
};

export async function sampleMediaRequest(request: Request, operation: (admin: AdminUser) => Promise<Response>) {
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      try { assertSameOrigin(request); }
      catch { return Response.json({ error: "Solicitud no válida." }, { status: 403, headers: sampleMediaHeaders }); }
    }
    const admin = await getCurrentAdmin();
    if (!admin) return Response.json({ error: "Tu sesión administrativa terminó." }, { status: 401, headers: sampleMediaHeaders });
    if (!canManageSamples(admin)) return Response.json({ error: "No tienes permiso para administrar muestras privadas." }, { status: 403, headers: sampleMediaHeaders });
    return await operation(admin);
  } catch (cause) {
    if (cause instanceof CollaborationConflict) return Response.json({ error: CONFLICT_MESSAGE, conflict: true }, { status: 409, headers: sampleMediaHeaders });
    if (cause instanceof SampleMediaError || cause instanceof MediaUploadRequestError) return Response.json({ error: cause.message }, { status: cause.status, headers: sampleMediaHeaders });
    const reference = `MUESTRA-${crypto.randomUUID().slice(0, 8)}`;
    console.error("Sample media operation failed", { reference, cause });
    return Response.json({ error: `No se pudo confirmar la operación. Revisa la muestra antes de repetirla. Referencia: ${reference}.` }, { status: 500, headers: sampleMediaHeaders });
  }
}
