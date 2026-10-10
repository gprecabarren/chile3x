const MB = 1_000_000;
export function multipartBodyLimit(path: string) {
  if (/^\/api\/(?:admin\/profiles|perfiles)\/[^/]+\/media$/.test(path) || path === "/api/mi-cuenta/contenido/medios") return 8 * MB + 64_000;
  if (/^\/api\/perfiles\/[^/]+\/reportes$/.test(path)) return 25 * MB + 64_000;
  if (/^\/api\/perfiles\/[^/]+\/documentos\/[^/]+$/.test(path)) return 15 * MB + 64_000;
  if (path === "/api/admin/noticias/media" || path === "/api/admin/patrocinadores" || /^\/api\/admin\/media\/[^/]+\/procesar$/.test(path)) return 5 * MB + 64_000;
  if (path === "/api/historias" || path === "/api/bugs" || /^\/api\/bugs\/[^/]+$/.test(path)) return 5 * MB + 64_000;
  return 1_048_576;
}

function tooLarge() {
  return Response.json({ error: "La carga supera el tamaño permitido para esta sección. Envía los archivos de a uno; cada video preparado admite hasta 8 MB." }, { status: 413, headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });
}

/** Bound missing-length uploads too; never buffer an unbounded request. Known
 * lengths stay streamed to vinext's independently bounded multipart parser. */
export async function limitMultipartUpload(request: Request): Promise<Request | Response> {
  if (request.method !== "POST" || !request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) return request;
  const limit = multipartBodyLimit(new URL(request.url).pathname);
  const length = request.headers.get("content-length");
  if (length !== null) {
    const size = Number(length);
    return !Number.isFinite(size) || size < 0 || size > limit ? tooLarge() : request;
  }
  if (!request.body) return request;
  const reader = request.body.getReader(); const parts: Uint8Array<ArrayBuffer>[] = []; let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) { await reader.cancel(); return tooLarge(); }
      parts.push(new Uint8Array(value));
    }
    const headers = new Headers(request.headers); headers.set("content-length", String(bytes));
    return new Request(request, { headers, body: new Blob(parts) });
  } finally { reader.releaseLock(); }
}
