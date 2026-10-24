export const ADMIN_CONTENT_PATH="/admin/contenido";
export const ADMIN_CONTENT_SECTIONS=[
  {href:"/admin/noticias",label:"Noticias",description:"Artículos, imágenes y metadatos del blog.",capability:"news.manage",icon:"edit"},
  {href:"/admin/patrocinadores",label:"Sitios asociados",description:"Textos, imágenes, enlaces y grupos de colaboradores.",capability:"settings.manage",icon:"open"},
  {href:"/admin/documentos-legales",label:"Términos y privacidad",description:"Documentos legales por secciones y bloques.",capability:"settings.manage",icon:"lock"},
  {href:"/admin/contenido/seo",label:"SEO e identidad",description:"Metadatos globales, indexación, identidad y vista de resultados.",capability:"settings.manage",icon:"search"},
  {href:"/admin/contenido/inicio",label:"Textos y SEO de los dos home",description:"Títulos, descripciones, botones y secciones del home actual y del compacto.",capability:"settings.manage",icon:"edit"},
  {href:"/admin/contenido/faq",label:"FAQ y reglas",description:"Preguntas frecuentes y reglas de publicación.",capability:"settings.manage",icon:"help"},
] as const;
export function isAdminContentPath(path:string|null){return !!path&&(path===ADMIN_CONTENT_PATH||ADMIN_CONTENT_SECTIONS.some(section=>path===section.href||path.startsWith(section.href+"/")));}
