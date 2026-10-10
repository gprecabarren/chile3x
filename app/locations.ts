export type RegionDirectory = {
  id: string;
  number: number;
  numeral: string;
  title: string;
  displayTitle: string;
  shortTitle: string;
  cities: readonly string[];
  coverageNote?: string;
};

// Cobertura inicial definida en "Chile 3X - 2024.docx". Las regiones están
// ordenadas por su número oficial, incluso cuando ese número no coincide con
// el orden geográfico en que fueron creadas las regiones más recientes.
export const regions = [
  { id: "tarapaca", number: 1, numeral: "I", title: "Región de Tarapacá", displayTitle: "Región I de Tarapacá", shortTitle: "Tarapacá", cities: ["Iquique"] },
  { id: "antofagasta", number: 2, numeral: "II", title: "Región de Antofagasta", displayTitle: "Región II de Antofagasta", shortTitle: "Antofagasta", cities: ["Antofagasta", "Calama"] },
  { id: "atacama", number: 3, numeral: "III", title: "Región de Atacama", displayTitle: "Región III de Atacama", shortTitle: "Atacama", cities: ["Caldera", "Copiapó", "Vallenar"] },
  { id: "coquimbo", number: 4, numeral: "IV", title: "Región de Coquimbo", displayTitle: "Región IV de Coquimbo", shortTitle: "Coquimbo", cities: ["La Serena", "Ovalle"] },
  { id: "valparaiso", number: 5, numeral: "V", title: "Región de Valparaíso", displayTitle: "Región V de Valparaíso", shortTitle: "Valparaíso", cities: ["Los Andes", "Quillota", "Valparaíso", "Viña del Mar"] },
  { id: "ohiggins", number: 6, numeral: "VI", title: "Región del Libertador General Bernardo O'Higgins", displayTitle: "Región VI del Libertador General Bernardo O'Higgins", shortTitle: "O'Higgins", cities: ["Rancagua", "San Fernando"] },
  { id: "maule", number: 7, numeral: "VII", title: "Región del Maule", displayTitle: "Región VII del Maule", shortTitle: "Maule", cities: ["Curicó", "Linares", "Talca"] },
  { id: "biobio", number: 8, numeral: "VIII", title: "Región del Biobío", displayTitle: "Región VIII del Biobío", shortTitle: "Biobío", cities: ["Concepción", "Los Ángeles"] },
  { id: "la-araucania", number: 9, numeral: "IX", title: "Región de La Araucanía", displayTitle: "Región IX de La Araucanía", shortTitle: "La Araucanía", cities: ["Pucón", "Temuco"] },
  { id: "los-lagos", number: 10, numeral: "X", title: "Región de Los Lagos", displayTitle: "Región X de Los Lagos", shortTitle: "Los Lagos", cities: ["Castro", "Osorno", "Puerto Montt"] },
  { id: "aysen", number: 11, numeral: "XI", title: "Región de Aysén del General Carlos Ibáñez del Campo", displayTitle: "Región XI de Aysén del General Carlos Ibáñez del Campo", shortTitle: "Aysén", cities: [], coverageNote: "Apertura territorial próxima." },
  { id: "magallanes-y-antartica-chilena", number: 12, numeral: "XII", title: "Región de Magallanes y de la Antártica Chilena", displayTitle: "Región XII de Magallanes y de la Antártica Chilena", shortTitle: "Magallanes", cities: ["Punta Arenas"] },
  { id: "metropolitana-de-santiago", number: 13, numeral: "XIII", title: "Región Metropolitana de Santiago", displayTitle: "Región XIII Metropolitana de Santiago", shortTitle: "Metropolitana", cities: ["Independencia", "Las Condes", "Lo Barnechea", "Melipilla", "Ñuñoa", "Providencia", "Santiago Centro", "Vitacura"] },
  { id: "los-rios", number: 14, numeral: "XIV", title: "Región de Los Ríos", displayTitle: "Región XIV de Los Ríos", shortTitle: "Los Ríos", cities: ["Valdivia"] },
  { id: "arica-y-parinacota", number: 15, numeral: "XV", title: "Región de Arica y Parinacota", displayTitle: "Región XV de Arica y Parinacota", shortTitle: "Arica y Parinacota", cities: ["Arica"] },
  { id: "nuble", number: 16, numeral: "XVI", title: "Región de Ñuble", displayTitle: "Región XVI de Ñuble", shortTitle: "Ñuble", cities: ["Chillán"] },
] satisfies readonly RegionDirectory[];

export const cityTotal = regions.reduce((total, region) => total + region.cities.length, 0);

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const cityDirectory = regions.flatMap((region) => region.cities.map((city) => ({
  city,
  citySlug: toSlug(city),
  region: region.title,
  regionDisplay: region.displayTitle,
  regionSlug: region.id,
})));

export function getRegionByTitle(title: string) {
  return regions.find((region) => region.title === title) ?? null;
}

export function formatRegionName(title: string) {
  return getRegionByTitle(title)?.displayTitle ?? title;
}

export function formatCompactRegionName(title: string) {
  const region = getRegionByTitle(title);
  return region ? `${region.numeral} región` : title;
}

// City-level reference only: never send a listing's address, location notes,
// account identity or coordinates to the external map. No API key or SDK.
export function getCityReferenceMap(city: string, region: string) {
  const query = `${city}, ${region}, Chile`;
  const embed = new URL("https://maps.google.com/maps");
  embed.search = new URLSearchParams({ q: query, hl: "es", z: "12", output: "embed" }).toString();
  const link = new URL("https://www.google.com/maps/search/");
  link.search = new URLSearchParams({ api: "1", query }).toString();
  return { embedUrl: embed.toString(), mapsUrl: link.toString() };
}

export function getCityBySlug(citySlug: string) {
  return cityDirectory.find((item) => item.citySlug === citySlug) ?? null;
}

// La cookie anterior mezclaba ciudades elegidas con estimaciones de red.
// Solo la preferencia elegida manualmente se usa para priorizar resultados.
export function getPreferredCitySlug(cookieStore: { get(name: string): { value: string } | undefined }) {
  return cookieStore.get("chile3x_preferred_city_v2")?.value ?? "";
}
