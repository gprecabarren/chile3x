export const FORUM_PAGE_SIZE = 20;
export const FORUM_MAX_SECTIONS = 200;
export const FORUM_LIMITS = { title: 120, sectionTitle: 80, group: 80, description: 320, rules: 2000, body: 6000, query: 100 } as const;

export class ForumInputError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function forumText(form: FormData, key: string, max: number, required = true) {
  const raw = form.get(key);
  if (typeof raw !== "string" || raw.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(raw)) throw new ForumInputError(`Revisa el campo ${key}: máximo ${max} caracteres.`);
  const text = raw.trim();
  if (required && !text) throw new ForumInputError(`Completa el campo ${key}.`);
  return text;
}

export function forumPage(value?: string) {
  return /^\d{1,4}$/.test(value ?? "") ? Math.max(1, Math.min(1000, Number(value))) : 1;
}

export function forumSearch(value?: string) { return (value ?? "").trim().slice(0, FORUM_LIMITS.query); }
export function forumSearchPattern(value: string) { return `%${value.replace(/[\\%_]/g, "\\$&")}%`; }
export function forumOrder(form: FormData) {
  const value = forumText(form, "orden", 5);
  if (!/^\d{1,4}$/.test(value)) throw new ForumInputError("El orden debe ser un número entre 0 y 9999.");
  return Number(value);
}
