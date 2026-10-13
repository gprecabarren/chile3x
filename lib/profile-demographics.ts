// Submission validation stays usable without loading the database layer.
export function profileDemographicsError(type: string, gender: string, age: string, required: boolean) {
  if (type !== "escort") return null;
  if (required && !gender) return "Selecciona el género del anuncio antes de enviarlo a revisión.";
  if (gender && !["Femenino", "Masculino", "No binario", "Trans"].includes(gender)) return "Selecciona un género válido para el anuncio.";
  if (required && !age) return "Indica la edad antes de enviar el anuncio a revisión.";
  if (age && (!/^\d{2}$/.test(age) || Number(age) < 18 || Number(age) > 99)) return "La edad debe ser un número entero entre 18 y 99 años.";
  return null;
}
