export const ADMIN_CONTENT_PATH = '/admin/contenido';
export const ADMIN_CONTENT_GROUPS = [
  { id: 'content', label: 'Textos e imágenes', description: 'Lo que se lee y se ve dentro de las páginas.', icon: 'text' },
  { id: 'search', label: 'SEO y buscadores', description: 'Resultados de búsqueda, enlaces compartidos e indexación. No cambia el cuerpo de las páginas.', icon: 'search' },
] as const;
export const ADMIN_CONTENT_SECTIONS = [
  { href: '/admin/contenido/inicio', label: 'Inicio · dos diseños', description: 'Textos visibles de las dos portadas y sus metadatos, separados dentro del editor.', capability: 'settings.manage', icon: 'text', group: 'content', scope: 'Textos + SEO', action: 'Editar inicio' },
  { href: '/admin/noticias', label: 'Noticias', description: 'Artículos e imágenes. Cada noticia conserva su propia configuración SEO.', capability: 'news.manage', icon: 'edit', group: 'content', scope: 'Artículos + SEO', action: 'Editar noticias' },
  { href: '/admin/patrocinadores', label: 'Sitios asociados', description: 'Textos, imágenes, enlaces y grupos de colaboradores.', capability: 'settings.manage', icon: 'open', group: 'content', scope: 'Textos e imágenes', action: 'Editar sitios asociados' },
  { href: '/admin/documentos-legales', label: 'Términos y privacidad', description: 'Contenido de los documentos legales, por secciones, con borradores y publicación.', capability: 'settings.manage', icon: 'lock', group: 'content', scope: 'Textos legales', action: 'Editar documentos' },
  { href: '/admin/contenido/faq', label: 'FAQ y reglas', description: 'Preguntas, respuestas y reglas que se muestran dentro de las páginas.', capability: 'settings.manage', icon: 'help', group: 'content', scope: 'Textos visibles', action: 'Editar FAQ y reglas' },
  { href: '/admin/contenido/seo', label: 'SEO global e identidad', description: 'Valores generales de respaldo, nombre del sitio e indexación global.', capability: 'settings.manage', icon: 'settings', group: 'search', scope: 'Configuración global', action: 'Editar SEO global' },
  { href: '/admin/contenido/seo/paginas', label: 'SEO por página', description: 'Metadatos de Quiénes somos, Contacto, FAQ, Términos, Privacidad y Reglas. No edita el texto visible de esas páginas.', capability: 'settings.manage', icon: 'search', group: 'search', scope: 'Metadatos por página', action: 'Elegir página y editar SEO' },
] as const;

export function activeAdminContentSection(path: string | null) {
  if (!path) return undefined;
  // Prefer the most specific editor, not both its parent and child routes.
  return ADMIN_CONTENT_SECTIONS.filter(section => path === section.href || path.startsWith(section.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
export function isAdminContentPath(path: string | null) {
  return !!path && (path === ADMIN_CONTENT_PATH || !!activeAdminContentSection(path));
}
