// The same conditional facts are rendered in HTML and tested for every subset
// of optional attributes. No placeholders or invented attributes are exposed.
export function profilePublicFacts(type: string, values: Record<string, string>): Array<[string, string]> {
  const metadata = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
  const candidates: Array<[string, string | null | undefined]> = type === "escort" ? [
    ["Edad", metadata.age ? `${metadata.age} años` : null], ["Género", metadata.gender], ["Nacionalidad", metadata.nationality], ["Idiomas", metadata.languages],
    ["Color de piel", metadata.skin_color], ["Color de pelo", metadata.hair_color], ["Tipo de cuerpo", metadata.body_type], ["Busto", metadata.bust_size],
    ["Medidas", metadata.measurements], ["Estatura", metadata.height_cm ? `${metadata.height_cm} cm` : null], ["Peso", metadata.weight_kg ? `${metadata.weight_kg} kg` : null],
  ] : type === "agency" ? [
    ["Años en el mercado", metadata.agency_years], ["Sitio web", metadata.website], ["Promociones", metadata.promotions], ["Métodos de contacto", metadata.contact_methods],
  ] : [
    ["Tipo de habitación", metadata.room_type], ["Amoblada", metadata.furnished], ["Baño privado", metadata.private_bathroom], ["Ventana al exterior", metadata.exterior_window],
    ["Tamaño", metadata.room_size ? `${metadata.room_size} m²` : null], ["Gastos comunes", metadata.common_expenses], ["Garantía", metadata.deposit],
    ["Duración mínima", metadata.minimum_rental], ["Disponibilidad inmediata", metadata.immediate_available], ["Internet/Wi-Fi", metadata.wifi],
    ["Agua, luz y gas", metadata.utilities_included], ["Uso de cocina", metadata.kitchen], ["Lavadora/secadora", metadata.laundry],
  ];
  return candidates.flatMap(([label, value]) => value?.trim() ? [[label, value.trim()] as [string, string]] : []);
}
