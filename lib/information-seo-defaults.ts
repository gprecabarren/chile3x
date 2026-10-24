// Existing public metadata, shared by the renderer and private editor.
// Keeping defaults separate makes preservation testable without a DB runtime.
export const INFORMATION_SEO_DEFAULTS = {
  contacto: { title: 'Contacto y soporte de Chile3X', description: 'Canales oficiales de Chile3X para consultas de cuenta, publicación, revisión, seguridad y reportes sobre perfiles del directorio.', socialTitle: 'Contacto | Chile3X' },
  faq: { title: 'Preguntas frecuentes', description: 'Respuestas sobre Chile3X, cuentas, publicación, moderación y el uso responsable del directorio para adultos.', socialTitle: 'Preguntas frecuentes | Chile3X' },
  reglas: { title: 'Reglas de publicación', description: 'Criterios de Chile3X para aprobar perfiles, agencias y arriendos.' },
  nosotros: {
    title: 'Quiénes somos: directorio de escorts en Chile',
    description: 'Conoce Chile3X, directorio de escorts, agencias y arriendos en Chile para mayores de 18 años. Publicación gratuita en esta etapa, revisión manual y contacto directo.',
    socialTitle: 'Quiénes somos: directorio de escorts en Chile | Chile3X',
    socialDescription: 'Conoce nuestro directorio de escorts, agencias y arriendos: publicación gratuita durante el lanzamiento, revisión manual y contacto directo.',
  },
} as const;
