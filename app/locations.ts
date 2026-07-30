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

export function getCityBySlug(citySlug: string) {
  return cityDirectory.find((item) => item.citySlug === citySlug) ?? null;
}
