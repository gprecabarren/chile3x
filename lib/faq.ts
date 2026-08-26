import { getSiteSettings } from "@/lib/site-settings";

export type FaqEntry = {
  question: string;
  answer: string;
};

export const defaultFaqEntries: FaqEntry[] = [
  { question: "¿Qué es Chile3X?", answer: "Chile3X es un directorio para personas adultas. Facilita encontrar perfiles, agencias y arriendos publicados; cualquier conversación o acuerdo se realiza directamente entre las personas involucradas." },
  { question: "¿Quién puede usar el sitio?", answer: "Solo personas mayores de 18 años. Al ingresar confirmas esta condición y debes respetar los Términos, la Privacidad y las Reglas de publicación." },
  { question: "¿Cómo se publica un perfil?", answer: "Crea una cuenta, completa el aviso y envíalo a revisión. El equipo decide si corresponde publicarlo, pedir cambios o rechazarlo. Por ahora las publicaciones iniciales se gestionan manualmente." },
  { question: "¿Por qué mi perfil o foto no se ve todavía?", answer: "Los perfiles y cada medio nuevo pasan por moderación. Mientras están en revisión permanecen privados; no se muestran en buscadores ni en el directorio público." },
  { question: "¿Cómo funcionan favoritos, likes y reseñas?", answer: "Necesitas una cuenta para guardar favoritos o reaccionar. Las reseñas se moderan antes de publicarse para reducir spam, suplantaciones y contenido que incumpla las reglas." },
  { question: "¿Chile3X guarda documentos de identidad o certificados médicos?", answer: "Solo si una escort decide adjuntarlos de forma opcional para revisión. Se almacenan de forma privada, no se muestran en el perfil ni se indexan, y solo la persona dueña o administradores autorizados pueden acceder a ellos." },
  { question: "¿Chile3X cobra o interviene en los acuerdos?", answer: "No interviene en pagos, citas ni acuerdos entre visitantes y anunciantes. Cualquier plan de publicación se coordina de forma directa con el equipo del portal." },
  { question: "¿Puedo recuperar o cambiar mi contraseña?", answer: "Sí. Usa “Olvidé mi clave” para recibir un enlace de restablecimiento en el correo de tu cuenta. Por seguridad, el enlace es temporal y solo puede utilizarse una vez. Si no lo encuentras, revisa Spam o contacta al soporte oficial." },
  { question: "¿Qué tipos de anuncios puedo crear?", answer: "Una cuenta puede crear avisos de Escort, Agencia o Arriendo. Cada tipo muestra únicamente los campos y categorías que le corresponden. El tipo queda definido al crear el anuncio; para publicar en otro tipo debes crear un aviso nuevo." },
  { question: "¿Cómo funcionan fotos, videos y la foto de perfil?", answer: "La foto de perfil, la galería y los videos se administran por separado después de guardar el aviso. Cada archivo nuevo se revisa antes de publicarse. Chile3X puede aplicar una marca de agua discreta y rechazar material que incumpla las reglas." },
  { question: "¿Para qué sirven las historias y los estados?", answer: "Las escorts pueden publicar historias temporales y estados de texto desde su panel. Las historias se ven en el directorio, en resultados que correspondan y en la ciudad del perfil. Las imágenes y videos temporales vencen automáticamente; los estados pueden eliminarse desde la cuenta." },
  { question: "¿Puedo pausar un aviso o indicar disponibilidad?", answer: "Sí. Desde el panel del anunciante puedes configurar rangos de horario y pausar el aviso cuando la función esté disponible para tu período. Pausar no equivale a eliminar la cuenta y la reactivación puede requerir revisión según el estado del anuncio." },
  { question: "¿Qué significa el distintivo de perfil verificado?", answer: "El distintivo verde se asigna manualmente tras una revisión adicional con los antecedentes disponibles. No reemplaza el criterio personal ni garantiza conductas futuras, pero permite identificar avisos que pasaron esa comprobación administrativa." },
  { question: "¿Cómo reporto u oculto un anuncio?", answer: "Debes iniciar sesión. Puedes reportar un anuncio indicando el motivo y adjuntar evidencias dentro del límite del formulario. También puedes ocultarlo para que deje de aparecerte; esa acción solo afecta a tu cuenta y puedes revertirla desde tu panel." },
  { question: "¿Qué es el contenido exclusivo?", answer: "Es una galería privada que una persona anunciante puede habilitar para cuentas específicas. Chile3X solo controla el acceso técnico: los pagos o acuerdos se coordinan directamente con el anunciante y no se procesan dentro del sitio." },
  { question: "¿Dónde reviso el rendimiento de mi anuncio?", answer: "El panel del anunciante muestra métricas de visualizaciones y de clics en los medios de contacto disponibles. Son indicadores de alcance dentro de Chile3X, no una garantía de reservas, pagos ni acuerdos externos." },
];

function sanitizeEntry(value: unknown): FaqEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  const question = typeof entry.question === "string" ? entry.question.trim().replace(/\s+/g, " ") : "";
  const answer = typeof entry.answer === "string" ? entry.answer.trim() : "";
  if (!question || !answer || question.length > 140 || answer.length > 700) return null;
  return { question, answer };
}

export function validateFaqEntries(value: string): FaqEntry[] | null {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 16) return null;
    const entries = parsed.map(sanitizeEntry);
    return entries.every((entry): entry is FaqEntry => Boolean(entry)) ? entries : null;
  } catch {
    return null;
  }
}

export function readFaqEntries(value: string | undefined | null): FaqEntry[] {
  return value ? validateFaqEntries(value) ?? defaultFaqEntries : defaultFaqEntries;
}

export async function getFaqEntries() {
  return readFaqEntries((await getSiteSettings()).faq_entries);
}
