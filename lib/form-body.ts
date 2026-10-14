export async function readTextForm(request: Request, maximum = 64_000) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^(application\/x-www-form-urlencoded|multipart\/form-data)/i.test(contentType)) throw new Error("Formato de formulario no admitido.");
  const reader = request.body?.getReader(); const parts: Uint8Array[] = []; let size = 0;
  if (reader) try {
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
      if (size > maximum) { await reader.cancel(); throw new Error("El formulario es demasiado grande. Reduce el texto e inténtalo nuevamente."); } parts.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  if (contentType.startsWith("multipart/form-data")) {
    const parsed = await new Response(bytes, { headers: { "content-type": contentType } }).formData();
    const keys = new Set<string>();
    for (const [key,value] of parsed) { if (typeof value !== "string" || keys.has(key)) throw new Error("El formulario contiene archivos o campos duplicados no admitidos."); keys.add(key); }
    return parsed;
  }
  const form = new FormData();
  for (const [key, value] of new URLSearchParams(new TextDecoder().decode(bytes))) { if (form.has(key)) throw new Error("El formulario contiene campos duplicados. Recarga la página."); form.set(key, value); }
  return form;
}
