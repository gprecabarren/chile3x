/** Browser-side preparation only: never enlarge or crop the uploaded source. */
export function imagePreparationSize(width: number, height: number, maxDimension: number) {
  if (![width, height, maxDimension].every((value) => Number.isFinite(value) && value > 0)) throw new Error("La imagen no tiene dimensiones válidas.");
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function imageQualityWarning(width: number, height: number) {
  return Math.min(width, height) < 600
    ? `Esta foto mide ${width} × ${height} píxeles y puede verse poco nítida en pantallas de alta resolución. Para más detalle, sube el archivo original, idealmente de al menos 900 píxeles de ancho. No ampliamos ni inventamos detalles.`
    : "";
}
