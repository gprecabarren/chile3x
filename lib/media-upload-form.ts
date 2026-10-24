export class MediaUploadRequestError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

/** Bound multipart bytes before parsing, including requests without Content-Length. */
export async function readMediaUploadForm(request: Request, maxFileBytes: number, maxBodyBytes = maxFileBytes + 256_000): Promise<FormData> {
  const tooLarge = () => new MediaUploadRequestError(`El envío supera el límite de esta sección (${maxFileBytes / 1_000_000} MB por archivo). En anuncios, las fotos finales admiten hasta 10 MB y los videos hasta 12 MB. Envía un archivo por vez.`, 413);
  if (Number(request.headers.get("content-length")) > maxBodyBytes) throw tooLarge();
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) throw new MediaUploadRequestError("El archivo no llegó como una carga válida. Recarga el panel y vuelve a seleccionarlo.");
  if (!request.body) throw new MediaUploadRequestError("El envío llegó vacío. Selecciona nuevamente el archivo original.");
  let length = 0;
  let streamFailure: unknown;
  const reader=request.body.getReader();
  let cancelled=false,released=false;
  const release=()=>{if(!released){released=true;reader.releaseLock();}};
  const bounded = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const {done,value}=await reader.read();if(cancelled)return;
        if(done){release();controller.close();return;}
        length+=value.byteLength;
        if(length>maxBodyBytes){streamFailure=tooLarge();await reader.cancel();throw streamFailure;}
        controller.enqueue(value);
      }catch(cause){streamFailure??=cause;release();if(!cancelled)controller.error(streamFailure);}
    },
    async cancel(reason){cancelled=true;try{if(!released)await reader.cancel(reason);}finally{release();}},
  });
  try { return await new Response(bounded, { headers: { "content-type": request.headers.get("content-type")! } }).formData(); }
  catch {
    if(streamFailure instanceof MediaUploadRequestError)throw streamFailure;
    if(streamFailure)throw new MediaUploadRequestError("El envío del archivo se interrumpió antes de completarse. Revisa la conexión y vuelve a intentarlo.");
    throw new MediaUploadRequestError("La carga llegó incompleta o dañada. Selecciona nuevamente el original; no se guardó ningún archivo.");
  }
}
