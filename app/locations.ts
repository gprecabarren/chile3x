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

// Coordenadas aproximadas de los centros urbanos cubiertos. Se usan solo en el
// navegador, después de que la persona acepta compartir su ubicación, para
// priorizar resultados sin enviar la ubicación a un servicio externo.
const cityCoordinates: Record<string, readonly [number, number]> = {
  "Arica": [-18.478, -70.312], "Iquique": [-20.214, -70.152], "Antofagasta": [-23.65, -70.4], "Calama": [-22.456, -68.93],
  "Caldera": [-27.066, -70.82], "Copiapó": [-27.366, -70.333], "Vallenar": [-28.576, -71.575], "La Serena": [-29.902, -71.2],
  "Ovalle": [-30.598, -71.2], "Los Andes": [-32.833, -70.6], "Quillota": [-32.88, -71.25], "Valparaíso": [-33.047, -71.61], "Viña del Mar": [-33.024, -71.552],
  "Independencia": [-33.412, -70.65], "Las Condes": [-33.41, -70.55], "Lo Barnechea": [-33.35, -70.515], "Melipilla": [-33.69, -71.215],
  "Ñuñoa": [-33.456, -70.597], "Providencia": [-33.43, -70.61], "Santiago Centro": [-33.45, -70.66], "Vitacura": [-33.39, -70.57],
  "Rancagua": [-34.17, -70.74], "San Fernando": [-34.585, -70.99], "Curicó": [-34.98, -71.24], "Linares": [-35.847, -71.595],
  "Talca": [-35.426, -71.666], "Chillán": [-36.606, -72.103], "Concepción": [-36.827, -73.05], "Los Ángeles": [-37.46, -72.35],
  "Pucón": [-39.28, -71.97], "Temuco": [-38.736, -72.59], "Valdivia": [-39.815, -73.24], "Castro": [-42.48, -73.82],
  "Osorno": [-40.57, -73.16], "Puerto Montt": [-41.47, -72.94], "Punta Arenas": [-53.16, -70.92],
};

export const cityGeoDirectory = cityDirectory.flatMap((city) => {
  const coordinates = cityCoordinates[city.city];
  return coordinates ? [{ ...city, latitude: coordinates[0], longitude: coordinates[1] }] : [];
});

export function getCityBySlug(citySlug: string) {
  return cityDirectory.find((item) => item.citySlug === citySlug) ?? null;
}
