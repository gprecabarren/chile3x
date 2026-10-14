import type { HelpProfile, HelpSearchResult, HelpTopic } from "./help-types";

export const HELP_QUERY_LIMIT = 500;
const stopWords = new Set("como que cual donde cuando cuanto cuantos puedo puede puedes podrias quiero necesito para por con del de el la las los un una uno unos unas y o es son mi mis me se en al a le lo si hay hacer tengo estar saber saberlo ahora porfavor favor hola todos todas ver veo".split(" "));
const synonyms: Record<string, string> = { fotos: "foto", fotografia: "foto", fotografias: "foto", imagen: "foto", imagenes: "foto", videos: "video", editar: "cambiar", modificar: "cambiar", reemplazar: "cambiar", subo: "subir", sube: "subir", subirla: "subir", cargar: "subir", agregar: "subir", contrasena: "clave", password: "clave", comentarios: "comentario", resena: "comentario", resenas: "comentario", historias: "historia", estados: "estado", mensajes: "mensaje", anuncios: "anuncio", perfil: "anuncio", perfiles: "anuncio", aprobacion: "aprobar", aceptar: "aprobar", aceptacion: "aprobar", correo: "email", borrar: "eliminar", quitar: "eliminar", fallo: "error", falla: "error", problema: "error", problemas: "error", whatsapp: "whatsapp" };
const conjugations: Record<string, string> = { cambio: "cambiar", cambia: "cambiar", cambiarla: "cambiar", edito: "cambiar", edita: "cambiar", apruebo: "aprobar", aprueba: "aprobar", acepto: "aprobar", publico: "publicar", publica: "publicar", elimino: "eliminar", elimina: "eliminar", x: "twitter" };

export function normalizeHelpQuery(value: string) {
  return value.slice(0, HELP_QUERY_LIMIT).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function terms(value: string) {
  return [...new Set(normalizeHelpQuery(value).split(" ").filter(term => (term.length > 1 || term === "x") && !stopWords.has(term)).map(term => synonyms[term] ?? conjugations[term] ?? term))];
}

export function searchHelpTopics(topics: HelpTopic[], question: string, limit = 6): HelpSearchResult[] {
  const query = terms(question);
  if (!query.length) return [];
  const results: HelpSearchResult[] = [];
  for (const topic of topics) {
    const title = terms(topic.title), aliases = terms(topic.aliases.join(" ")), content = terms(`${topic.summary} ${topic.steps.join(" ")}`);
    const matches = query.filter(term => title.includes(term) || aliases.includes(term) || content.includes(term));
    const coverage = matches.length / query.length;
    // Prefer an operational alias, not an incidental word buried in instructions.
    const exact = topic.aliases.some(alias => {
      const phrase = terms(alias);
      const singleKeyword = query.length === 1 && normalizeHelpQuery(alias).split(" ").length === 1;
      return (phrase.length >= 2 || singleKeyword) && phrase.length > 0 && phrase.every(term => query.includes(term));
    });
    const score = (exact ? 45 : 0) + query.reduce((sum, term) => sum + (title.includes(term) ? 10 : aliases.includes(term) ? 7 : content.includes(term) ? 1 : 0), 0) + coverage * 8 - (query.length - matches.length) * 8;
    if ((coverage >= 0.5 || exact) && score >= 9) results.push({ topic, score, coverage, exact });
  }
  return results.sort((a, b) => b.score - a.score || a.topic.id.localeCompare(b.topic.id)).slice(0, Math.max(1, Math.min(20, limit)));
}

export function helpAnswer(topics: HelpTopic[], question: string) {
  if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|gracias)$/.test(normalizeHelpQuery(question))) {
    const introduction = topics.find(topic => topic.id === "general-help");
    if (introduction) return { kind: "answer" as const, topics: [introduction] };
  }
  const results = searchHelpTopics(topics, question, 3);
  if (!results.length) return { kind: "fallback" as const, topics: [] as HelpTopic[] };
  const [first, second] = results;
  if ((first.exact || first.coverage >= 0.75) && (!second || first.score >= second.score * 1.2)) return { kind: "answer" as const, topics: [first.topic] };
  return { kind: "choices" as const, topics: results.map(result => result.topic) };
}

export function helpTopicLink(topic: HelpTopic, profile: HelpProfile | undefined) {
  if (!profile || topic.audience !== "account" || !topic.link.target) return topic.link.href;
  const root = `/mi-cuenta/${encodeURIComponent(profile.id)}`;
  const targets = { edit: `${root}/editar`, media: `${root}/editar#fotos-y-videos`, documents: `${root}/editar#documentos-privados`, stories: `${root}/historias`, stats: `${root}/estadisticas`, preview: profile.publicPath };
  return targets[topic.link.target];
}

export function sensitiveHelpQuery(value: string) {
  return /[^\s@]+@[^\s@]+\.[^\s@]+|\b\d{8,}\b|(?:clave|contrasena|contraseña|password)\s*(?:es\s+|[:=]\s*)\S+/i.test(value);
}
