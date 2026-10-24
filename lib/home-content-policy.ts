import type {HomeLayout} from "./home-layout-policy";
export const HOME_TEXT_FIELDS = {
  seoTitle:["Título SEO (pestaña y Google)","Directorio de escorts en Chile por ciudad | Chile3X",90],
  seoDescription:["Descripción SEO","Explora anuncios de escorts, agencias y arriendos en Chile. Busca por ciudad, región y categoría, y contacta directamente al anunciante. Solo mayores de 18 años.",180],
  socialTitle:["Título al compartir","Directorio de escorts en Chile por ciudad | Chile3X",90],
  socialDescription:["Descripción al compartir","Anuncios de escorts, agencias y arriendos por ciudad en Chile. Contacto directo con el anunciante. Solo mayores de 18 años.",180],
  eyebrow:["Encabezado pequeño","DIRECTORIO ADULTO · TODO CHILE",100],
  title:["H1 · título principal","Directorio de escorts",120],
  titleAccent:["H1 · parte destacada","en Chile por ciudad.",120],
  intro:["Introducción","Explora perfiles de escorts y damas de compañía, además de agencias y arriendos para adultos, por región, ciudad, categoría y servicios.",500],
  mainButton:["Botón principal","Explorar perfiles",50],
  secondaryButton:["Enlace para publicar","Quiero anunciarme",50],
  coverageButton:["Botón de regiones (home clásico)","Explorar regiones de Chile",50],
  featuredEyebrow:["Destacados · encabezado","ESCORTS Y DAMAS DE COMPAÑÍA DESTACADAS",100],
  featuredTitle:["Destacados · título","Lo más visto",120],
  featuredAccent:["Destacados · parte destacada","del directorio.",120],
  regionsEyebrow:["Regiones · encabezado","COBERTURA TERRITORIAL",100],
  regionsTitle:["Regiones · título","Todas las regiones,",120],
  regionsAccent:["Regiones · parte destacada","ciudades iniciales.",120],
  coverageNote:["Aclaración de disponibilidad","La disponibilidad de perfiles se activará progresivamente por territorio tras la revisión de cada publicación.",500],
  searchLabel:["Buscador · etiqueta","Buscar escort o dama de compañía por nombre",100],
  searchPlaceholder:["Buscador · ejemplo","Ej. Valentina, Camila...",100],
  searchButton:["Buscador · botón","Buscar",50],
  bannerTitle:["Banner · título","Un espacio adulto,",120],
  bannerAccent:["Banner · parte destacada","privado y claro.",120],
  bannerText:["Banner · descripción","Encuentra publicaciones revisadas y contacta directamente a cada anunciante.",500],
  bannerButton:["Banner · botón","Ver directorio nacional",50],
  processEyebrow:["Ventajas · encabezado","HECHO PARA CRECER CON ORDEN",100],
  processTitle:["Ventajas · título","Más control para quien publica.",120],
  feature1Title:["Ventaja 1 · título","Perfiles revisados",90],
  feature1Text:["Ventaja 1 · descripción","Cada publicación pasa por moderación antes de hacerse visible.",400],
  feature2Title:["Ventaja 2 · título","Cobertura territorial",90],
  feature2Text:["Ventaja 2 · descripción","La navegación considera región y las ciudades iniciales definidas para el lanzamiento.",400],
  feature3Title:["Ventaja 3 · título","Contacto directo",90],
  feature3Text:["Ventaja 3 · descripción","El portal muestra información; el acuerdo es directamente con el anunciante.",400],
  poster1:["Cartel · línea 1","Privado.",50],poster2:["Cartel · línea 2","Visible.",50],poster3:["Cartel · línea 3","Tuyo.",50],
  ctaEyebrow:["Publicar · encabezado","PUBLICACIÓN GRATUITA EN ESTA ETAPA",100],
  ctaTitle:["Publicar · título","¿Quieres aparecer en Chile3X?",120],
  ctaText:["Publicar · descripción","Crea tu cuenta y envía tu anuncio a revisión. Publicar es gratis durante el lanzamiento, sin tarjeta ni cobros automáticos.",600],
  ctaButton:["Publicar · botón para visitantes","Crear cuenta",50],
  cityTitle:["Ciudades · título (home compacto)","Elige una ciudad",100],
  cityAll:["Ciudades · ver todo","Ver todo Chile",50],
  citySearchLabel:["Ciudades · etiqueta de búsqueda","Buscar ciudad",80],
  citySearchPlaceholder:["Ciudades · ejemplo de búsqueda","Escribe una ciudad",80],
} as const;
export type HomeTextKey=keyof typeof HOME_TEXT_FIELDS;
export type HomeTexts=Record<HomeTextKey,string>;
export const HOME_REQUIRED_TEXT_FIELDS=new Set<HomeTextKey>([
  "seoTitle","seoDescription","title","mainButton","secondaryButton",
  "coverageButton","featuredTitle","regionsTitle",
  "searchLabel","searchButton","bannerTitle","bannerButton","processTitle",
  "feature1Title","feature2Title","feature3Title","ctaTitle","ctaButton",
  "cityTitle","cityAll","citySearchLabel",
]);
export function defaultHomeTexts(layout:HomeLayout):HomeTexts {
  const values=Object.fromEntries(Object.entries(HOME_TEXT_FIELDS).map(([key,value])=>[key,value[1]])) as HomeTexts;
  if(layout==="compact")values.intro="Elige una ciudad para explorar escorts y damas de compañía en Chile. También encontrarás agencias y arriendos para adultos.";
  return values;
}
export function parseHomeTexts(json:string,layout:HomeLayout,strict=false):HomeTexts {
  const defaults=defaultHomeTexts(layout);let parsed:unknown;
  try{parsed=json?JSON.parse(json):{};}catch{if(strict)throw new Error("Contenido del home no válido.");return defaults;}
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)){if(strict)throw new Error("Contenido del home no válido.");return defaults;}
  for(const [key,definition] of Object.entries(HOME_TEXT_FIELDS)) {
    const value=(parsed as Record<string,unknown>)[key];if(value===undefined)continue;
    if(typeof value!=="string"||value.length>definition[2]||/[<>\u0000-\u0008]/.test(value)){if(strict)throw new Error(`Revisa ${definition[0]} (máximo ${definition[2]} caracteres, solo texto).`);continue;}
    const normalized=value.trim();
    if(!normalized&&HOME_REQUIRED_TEXT_FIELDS.has(key as HomeTextKey)){if(strict)throw new Error(`${definition[0]} es obligatorio.`);continue;}
    defaults[key as HomeTextKey]=normalized;
  }
  // Adopt the renamed default for existing settings without a database write;
  // deliberately customized labels remain editable and unchanged.
  if(defaults.coverageButton==="Explorar cobertura")defaults.coverageButton=HOME_TEXT_FIELDS.coverageButton[1];
  return defaults;
}
