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
