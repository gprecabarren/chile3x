/** Never expose a proxy's HTML/plain text or a JSON SyntaxError to uploaders. */
export async function readUploadResponse<T>(response: Response, sizeHelp = "Cada foto admite hasta 5 MB y cada video preparado hasta 8 MB. Vuelve a preparar el archivo e inténtalo nuevamente."): Promise<T> {
  if (response.status === 413) throw new Error(`La carga supera el tamaño permitido. ${sizeHelp}`);
  let payload: T & { error?: string };
  try { payload = await response.json(); }
  catch { throw new Error("No se pudo completar la carga. Revisa tu conexión e inténtalo nuevamente; no se confirmó el archivo."); }
  if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "No se pudo completar la carga. Inténtalo nuevamente.");
  return payload;
}
