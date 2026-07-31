import { getSiteSettings } from "@/lib/site-settings";

export type PublicationRule = {
  title: string;
  body: string;
};

export const defaultPublicationRules: PublicationRule[] = [
  { title: "Verificación opcional", body: "Una escort puede adjuntar de forma voluntaria una imagen de carnet y/o examen médico para revisión interna. Estos archivos son privados, no se publican y solo pueden ser vistos por la persona dueña del perfil y administradores autorizados. No subas documentos de terceros." },
  { title: "Requisitos mínimos", body: "Las publicaciones deben corresponder a personas adultas o negocios autorizados, describirse de manera honesta y usar información de contacto propia o con permiso. Todo perfil pasa por revisión manual antes de ser visible." },
  { title: "Imágenes y videos", body: "Solo se podrán publicar fotos o videos propios o con autorización verificable de quienes aparezcan. Deben corresponder al perfil anunciado y no pueden incluir menores, violencia, coerción, contenido ilegal, marcas de terceros sin autorización ni datos que permitan ubicar una dirección privada." },
  { title: "Agencias y asociaciones", body: "Una agencia puede invitar perfiles de escort, pero la asociación solo se mostrará después de que cada escort la acepte desde su cuenta. Una agencia no puede atribuirse la representación de otra persona sin ese consentimiento." },
  { title: "Arriendos", body: "Los anuncios de arriendo deben incluir información real sobre condiciones, ubicación referencial y precio. No se permiten engaños, cobros anticipados abusivos, discriminación ilegal ni publicaciones que oculten condiciones esenciales." },
  { title: "Motivos de rechazo o retiro", body: "Podemos rechazar o retirar perfiles con contenido ilegal, suplantación, datos falsos, lenguaje de odio, acoso, spam, enlaces maliciosos, explotación de terceros o incumplimientos de estas reglas. La reiteración puede implicar suspensión de la cuenta." },
];

function sanitizeRule(value: unknown): PublicationRule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const rule = value as Record<string, unknown>;
  const title = typeof rule.title === "string" ? rule.title.trim().replace(/\s+/g, " ") : "";
  const body = typeof rule.body === "string" ? rule.body.trim() : "";
  if (!title || !body || title.length > 120 || body.length > 1400) return null;
  return { title, body };
}

export function validatePublicationRules(value: string): PublicationRule[] | null {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 20) return null;
    const entries = parsed.map(sanitizeRule);
    return entries.every((entry): entry is PublicationRule => Boolean(entry)) ? entries : null;
  } catch {
    return null;
  }
}

export function readPublicationRules(value: string | undefined | null): PublicationRule[] {
  return value ? validatePublicationRules(value) ?? defaultPublicationRules : defaultPublicationRules;
}

export async function getPublicationRules() {
  return readPublicationRules((await getSiteSettings()).publication_rules);
}

export function formatPublicationRulesUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "30 de julio de 2026";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(date);
}
