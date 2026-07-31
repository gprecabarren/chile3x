export type RegionDirectory = {
  id: string;
  title: string;
  shortTitle: string;
  cities: readonly string[];
  coverageNote?: string;
};

// Cobertura inicial definida en "Chile 3X - 2024.docx".
// Se mantienen las 16 regiones, pero solo se publican las ciudades y comunas
// nombradas expresamente en el documento.
export const regions = [
  { id: "arica-y-parinacota", title: "Región de Arica y Parinacota", shortTitle: "Arica y Parinacota", cities: ["Arica"] },
  { id: "tarapaca", title: "Región de Tarapacá", shortTitle: "Tarapacá", cities: ["Iquique"] },
  { id: "antofagasta", title: "Región de Antofagasta", shortTitle: "Antofagasta", cities: ["Antofagasta", "Calama"] },
  { id: "atacama", title: "Región de Atacama", shortTitle: "Atacama", cities: ["Caldera", "Copiapó", "Vallenar"] },
  { id: "coquimbo", title: "Región de Coquimbo", shortTitle: "Coquimbo", cities: ["La Serena", "Ovalle"] },
  { id: "valparaiso", title: "Región de Valparaíso", shortTitle: "Valparaíso", cities: ["Los Andes", "Quillota", "Valparaíso", "Viña del Mar"] },
  {
    id: "metropolitana-de-santiago",
    title: "Región Metropolitana de Santiago",
    shortTitle: "Metropolitana",
    cities: ["Independencia", "Las Condes", "Lo Barnechea", "Melipilla", "Ñuñoa", "Providencia", "Santiago Centro", "Vitacura"],
    coverageNote: "Cobertura indicada para todas las comunas de la Región Metropolitana.",
  },
  { id: "ohiggins", title: "Región del Libertador General Bernardo O'Higgins", shortTitle: "O'Higgins", cities: ["Rancagua", "San Fernando"] },
  { id: "maule", title: "Región del Maule", shortTitle: "Maule", cities: ["Curicó", "Linares", "Talca"] },
  { id: "nuble", title: "Región de Ñuble", shortTitle: "Ñuble", cities: ["Chillán"] },
  { id: "biobio", title: "Región del Biobío", shortTitle: "Biobío", cities: ["Concepción", "Los Ángeles"] },
  { id: "la-araucania", title: "Región de La Araucanía", shortTitle: "La Araucanía", cities: ["Pucón", "Temuco"] },
  { id: "los-rios", title: "Región de Los Ríos", shortTitle: "Los Ríos", cities: ["Valdivia"] },
  { id: "los-lagos", title: "Región de Los Lagos", shortTitle: "Los Lagos", cities: ["Castro", "Osorno", "Puerto Montt"] },
  { id: "aysen", title: "Región de Aysén del General Carlos Ibáñez del Campo", shortTitle: "Aysén", cities: [], coverageNote: "Apertura territorial próxima." },
  { id: "magallanes-y-antartica-chilena", title: "Región de Magallanes y de la Antártica Chilena", shortTitle: "Magallanes", cities: ["Punta Arenas"] },
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
  regionSlug: region.id,
})));

// Coordenadas aproximadas de los centros urbanos cubiertos. Se usan solo en el
// navegador, después de que la persona acepta compartir su ubicación, para
// priorizar resultados sin enviar la ubicación a un servicio externo.
const cityCoordinates: Record<string, readonly [number, number]> = {
  "Arica": [-18.478, -70.312], "Iquique": [-20.214, -70.152], "Antofagasta": [-23.65, -70.4], "Calama": [-22.456, -68.93],
  "Caldera": [-27.066, -70.82], "Copiapó": [-27.366, -70.333], "Vallenar": [-28.576, -70.76], "La Serena": [-29.902, -71.25],
  "Ovalle": [-30.598, -71.2], "Los Andes": [-32.833, -70.6], "Quillota": [-32.88, -71.25], "Valparaíso": [-33.047, -71.61], "Viña del Mar": [-33.024, -71.552],
  "Independencia": [-33.412, -70.65], "Las Condes": [-33.41, -70.55], "Lo Barnechea": [-33.35, -70.515], "Melipilla": [-33.69, -71.215],
  "Ñuñoa": [-33.456, -70.597], "Providencia": [-33.43, -70.61], "Santiago Centro": [-33.45, -70.66], "Vitacura": [-33.39, -70.57],
  "Rancagua": [-34.17, -70.74], "San Fernando": [-34.585, -70.99], "Curicó": [-34.98, -71.24], "Linares": [-35.847, -71.595],
  "Talca": [-35.426, -71.666], "Chillán": [-36.606, -72.103], "Concepción": [-36.827, -73.05], "Los Ángeles": [-37.46, -72.35],
  "Pucón": [-39.28, -71.97], "Temuco": [-38.736, -72.59], "Valdivia": [-39.815, -73.24], "Castro": [-42.48, -73.76],
  "Osorno": [-40.57, -73.13], "Puerto Montt": [-41.47, -72.94], "Punta Arenas": [-53.16, -70.92],
};

export const cityGeoDirectory = cityDirectory.flatMap((city) => {
  const coordinates = cityCoordinates[city.city];
  return coordinates ? [{ ...city, latitude: coordinates[0], longitude: coordinates[1] }] : [];
});

export function getCityBySlug(citySlug: string) {
  return cityDirectory.find((item) => item.citySlug === citySlug) ?? null;
}
