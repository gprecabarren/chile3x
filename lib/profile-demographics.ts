// Submission validation stays usable without loading the database layer.
export const escortGenders = ["Femenino", "Masculino", "No binario"] as const;

export function profileDemographicsError(type: string, gender: string, age: string, required: boolean, allowLegacyGender = false) {
  if (type !== "escort") return null;
  if (required && !gender) return "Selecciona el género del anuncio antes de enviarlo a revisión.";
  if (gender && !escortGenders.some(value => value === gender) && !(allowLegacyGender && gender === "Trans")) return "Selecciona un género válido para el anuncio.";
  if (!age) return "La edad es obligatoria para guardar un anuncio de tipo escort, incluso como borrador.";
  if (age && (!/^\d{2}$/.test(age) || Number(age) < 18 || Number(age) > 99)) return "La edad debe ser un número entero entre 18 y 99 años.";
  return null;
}
