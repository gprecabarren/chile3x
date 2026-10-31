import type { LegalDocument, LegalKey, LegalSection } from "./legal-document";
export const AGENCY_LEGAL_VERSION = "2026.10.31.1";
export const AGENCY_LEGAL_SECTION: LegalSection = {
  id: "agencias-titularidad",
  title: "Gestión de agencias y control del anuncio",
  blocks: [
    {
      id: "management-modes",
      type: "paragraph",
      text: "Una cuenta puede tener un Escort personal, agencias y arriendos. Cada agencia puede crear varios Escorts gestionados con ID propio, ligados a esa agencia mientras no se vinculen a una cuenta personal. Estos perfiles no crean cuentas ni correos ficticios, no consumen el cupo personal de quien gestiona la agencia y solo son visibles si tanto el Escort como su agencia cumplen la publicación y visibilidad requeridas. Venta solo de contenido no admite este modo de representación.",
    },
    {
      id: "management-consent",
      type: "paragraph",
      text: "La titular de un Escort con cuenta decide si autoriza a cada agencia a editar datos, contactos, categoría, fotos, videos, historias, visibilidad, envío a revisión, estadísticas y moderación de comentarios de ese anuncio. La consulta, carga, sustitución o retirada de documentos privados de identidad y médicos requiere autorización específica adicional, opcional y revocable. Un vínculo público por sí solo no habilita esos permisos. La agencia que aporta documentos de una persona sin cuenta debe contar con su autorización específica y facilitar su revisión por el equipo.",
    },
    {
      id: "management-claim",
      type: "paragraph",
      text: "La agencia puede proponer vincular un perfil gestionado al correo de una cuenta existente, activa y verificada. La propuesta vence a los siete días. Solo se completa cuando la cuenta destinataria acepta el anuncio y sus permisos, administración comprueba manualmente la titularidad y la cuenta no tiene otro Escort personal fuera de papelera. Los cambios posteriores del anuncio exigen confirmar su versión actual. Se conserva el ID, enlace, medios, reseñas y estadísticas; la cuenta destinataria pasa a ser titular y puede retirar la gestión o salir de la agencia sin perder el anuncio. La comprobación de titularidad no equivale a una verificación de identidad o médica.",
    },
    {
      id: "management-revocation",
      type: "paragraph",
      text: "La asociación no exige exclusividad: una titular con cuenta puede aceptar varias agencias, incluso una de su propia cuenta, y revocar los permisos por separado. Al salir conviene revisar los contactos publicados. La autorización de un anuncio no comparte contraseñas, seguridad, bandeja personal de mensajes ni biblioteca privada de toda la cuenta. Las conversaciones anteriores de la agencia permanecen en la cuenta de esa agencia. Un perfil todavía sin cuenta personal no puede quedarse sin su agencia de origen mediante una simple desvinculación.",
    },
    {
      id: "management-records",
      type: "paragraph",
      text: "El panel muestra invitaciones, propuestas, permisos y un historial atribuible de gestión. Se conservan registros de permisos y actividad de agencias durante 180 días y estados de avisos de correo durante 90 días, sin incorporar copias de documentos ni su contenido en esos registros. El historial de entrega de correo tiene su política propia. Los correos son avisos: no aceptan invitaciones, no transfieren titularidad y su aceptación por un proveedor no acredita lectura. Una retirada de permisos bloquea nuevas acciones de la agencia; no puede retirar copias que ya hubiese obtenido legítimamente.",
    },
  ],
};
export const AGENCY_LEGAL_PATCHES = [
  [
    "terms",
    "Una agencia solo puede vincular a una escort con autorización expresa de esa persona. La invitación debe ser aceptada por la cuenta correspondiente; está prohibido crear relaciones aparentes, reutilizar identidades o agregar personas sin consentimiento. La agencia responde por la veracidad de su información institucional y por sus propios actos, sin adquirir propiedad ni control sobre las cuentas vinculadas.",
    "Una agencia solo puede representar a una persona adulta con su autorización expresa y suficiente para los datos y materiales utilizados. Puede invitar a un Escort que ya tiene cuenta, cuya titular debe aceptar el vínculo y los permisos, o preparar un perfil gestionado con ID propio y sin cuenta personal vinculada, declarando la autorización de la persona representada. Ambos modos mantienen la revisión de publicación y archivos. Está prohibido crear relaciones aparentes, reutilizar identidades o agregar personas sin consentimiento. Una asociación no otorga propiedad ni acceso a la seguridad de otra cuenta.",
  ],
  [
    "terms",
    "Las categorías de visibilidad y etiquetas propias de escorts, como VIP, Premium, Bronze, MILF, Trans, Hombres o Masajes, no se aplican a agencias ni arriendos.",
    "Escort y Agencia pueden seleccionar VIP, Premium o Bronze según las opciones disponibles del sitio. Estas categorías no conceden verificaciones de identidad ni médicas. Las etiquetas personales como MILF, Trans, Hombres o Masajes no se trasladan al anuncio institucional de una agencia ni a un arriendo; Arriendo conserva su directorio propio.",
  ],
  [
    "privacy",
    "Recibimos datos directamente de la persona que visita, se registra, publica, comenta o reporta; de una agencia cuando invita a vincular un perfil, sujeto a aceptación de la escort; del funcionamiento técnico del sitio; y de proveedores que confirman entregas de correo, seguridad o funcionamiento.",
    "Recibimos datos directamente de la persona que visita, se registra, publica, comenta o reporta; de una agencia que invita a una titular con cuenta o que prepara un perfil gestionado con autorización expresa de la persona representada; del funcionamiento técnico del sitio; y de proveedores que confirman entregas de correo, seguridad o funcionamiento. Vincular un perfil gestionado a otra cuenta requiere aceptación de esa cuenta y comprobación manual de administración.",
  ],
] as const;
/** Only the no-database fallback; published documents remain editor-owned. */
export function agencyLegalFallback(
  document: LegalDocument,
  key: LegalKey,
): LegalDocument {
  return {
    ...document,
    sections: [
      ...document.sections.map((section) => ({
        ...section,
        blocks: section.blocks.map((block) => ({
          ...block,
          text:
            AGENCY_LEGAL_PATCHES.find(
              ([id, old]) => id === key && old === block.text,
            )?.[2] ?? block.text,
        })),
      })),
      AGENCY_LEGAL_SECTION,
    ],
  };
}
