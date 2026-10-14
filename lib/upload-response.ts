/** Never expose a proxy's HTML/plain text or a JSON SyntaxError to uploaders. */
export async function readUploadResponse<T>(response: Response, sizeHelp = "Cada foto preparada admite hasta 10 MB y cada video hasta 12 MB. Vuelve a preparar el archivo e inténtalo nuevamente."): Promise<T> {
  if (response.status === 413) {
    let detail: string | undefined;
    try { const payload = await response.json() as { error?: unknown }; if (typeof payload?.error === "string") detail = payload.error; } catch { /* A proxy can send HTML or plain text. */ }
    throw new Error(detail ?? `La carga supera el tamaño permitido. ${sizeHelp}`);
  }
  let payload: T & { error?: string };
  try { payload = await response.json(); }
  catch { throw new Error(`El servidor devolvió una respuesta no válida (HTTP ${response.status}). Revisa tu conexión e inténtalo nuevamente; no se confirmó el archivo. Si persiste, indica este código a soporte.`); }
  if (!response.ok) {
    const detail = typeof payload?.error === "string" ? payload.error : `El servidor rechazó la carga (HTTP ${response.status}).`;
    const nextStep = response.status === 401 ? " Vuelve a iniciar sesión en otra pestaña y reintenta este archivo." : response.status === 403 ? " Revisa los permisos y la verificación de tu cuenta; recarga el panel si el aviso persiste." : response.status === 429 ? " Espera un momento antes de volver a intentar." : response.status >= 500 ? " Es un problema del servidor, no del formato de tu archivo. Reintenta más tarde o contacta a soporte." : "";
    throw new Error(`${detail}${nextStep}`);
  }
  return payload;
}

/** A network failure cannot prove whether the server received the upload. */
export async function uploadMediaRequest<T>(url: string, body: FormData): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { method: "POST", body }); }
  catch {
    throw new Error(typeof navigator !== "undefined" && navigator.onLine === false
      ? "El dispositivo está sin conexión. Conéctate a internet y reintenta este archivo."
      : "La conexión se interrumpió durante el envío. No pudimos confirmar la carga: revisa si el archivo aparece en tu galería antes de reintentar para no duplicarlo.");
  }
  return readUploadResponse<T>(response);
}
