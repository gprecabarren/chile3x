export class MediaUploadRequestError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

/** Bound multipart bytes before parsing, including requests without Content-Length. */
export async function readMediaUploadForm(request: Request, maxFileBytes: number): Promise<FormData> {
  const maxBodyBytes = maxFileBytes + 256_000;
  const tooLarge = () => new MediaUploadRequestError("El envío supera el límite: cada foto o video final admite hasta 10 MB. Envía un archivo por vez.", 413);
  if (Number(request.headers.get("content-length")) > maxBodyBytes) throw tooLarge();
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) throw new MediaUploadRequestError("El archivo no llegó como una carga válida. Recarga el panel y vuelve a seleccionarlo.");
  if (!request.body) throw new MediaUploadRequestError("El envío llegó vacío. Selecciona nuevamente el archivo original.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBodyBytes) { await reader.cancel(); throw tooLarge(); }
      chunks.push(value);
    }
  } catch (cause) {
    if (cause instanceof MediaUploadRequestError) throw cause;
    throw new MediaUploadRequestError("El envío del archivo se interrumpió antes de completarse. Revisa la conexión y vuelve a intentarlo.");
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return await new Response(bytes, { headers: { "content-type": request.headers.get("content-type")! } }).formData(); }
  catch { throw new MediaUploadRequestError("La carga llegó incompleta o dañada. Selecciona nuevamente el original; no se guardó ningún archivo."); }
}
