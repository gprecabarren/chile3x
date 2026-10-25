// Server-side release gate shared by routing, permissions and retention.
export const PRIVATE_SAMPLES_ENABLED = true;
export const SAMPLE_COOKIE = "chile3x_sample_access";
export const SAMPLE_LIFETIME_MS = 7 * 86_400_000;
export const SAMPLE_RETENTION_MS = 30 * 86_400_000;
export const SAMPLE_ID = /^sam_[a-f0-9-]{36}$/;
export const SAMPLE_HANDLE = /^[a-z0-9](?:[a-z0-9_-]{1,38}[a-z0-9])$/;
export const SAMPLE_TOKEN = /^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{43})$/;
export const SAMPLE_PROVENANCES = ["sexosur", "publiescort", "relaxchile", "elsilencio", "otros"] as const;
export type SampleProvenance = typeof SAMPLE_PROVENANCES[number];
export const SAMPLE_PROVENANCE_LABELS: Record<SampleProvenance, string> = {
  sexosur: "Sexosur", publiescort: "Publiescort", relaxchile: "Relaxchile", elsilencio: "Elsilencio", otros: "Otros",
};
export const SAMPLE_STATUSES = ["active", "unshared", "migrated", "trashed"] as const;
export type SampleStatus = typeof SAMPLE_STATUSES[number];
export const SAMPLE_STATUS_LABELS: Record<SampleStatus, string> = {
  active: "Enlace habilitado", unshared: "Sin enlace compartido", migrated: "Convertida en anuncio", trashed: "En papelera",
};
type SampleLifecycle = { expiresAt: number; migratedAt: string | null; trashedAt?: number | null };
export const PRIVATE_SAMPLE_HEADER = "x-chile3x-private-sample";
export function isSamplePath(path: string) { return path === "/muestra" || path.startsWith("/muestra/"); }
export function newSampleToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), value=>value.toString(16).padStart(2,"0")).join("");
}
export async function sampleTokenHash(token: string) {
  if (!SAMPLE_TOKEN.test(token)) return null;
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token))),value=>value.toString(16).padStart(2,"0")).join("");
}
export function sampleCanEdit(sample: SampleLifecycle, now = Date.now()) {
  return !sample.migratedAt && sample.trashedAt == null && sample.expiresAt > now;
}
export function sampleIsAvailable(sample: SampleLifecycle & { tokenHash: string | null; legacyTokenHash?: string | null }, now = Date.now()) {
  return sampleCanEdit(sample, now) && Boolean(sample.tokenHash || sample.legacyTokenHash);
}
export function sampleListStatus(sample: SampleLifecycle & { tokenHash?: string | null; legacyTokenHash?: string | null; shared?: boolean }, now = Date.now()): SampleStatus {
  if (sample.trashedAt != null) return "trashed";
  if (sample.migratedAt) return "migrated";
  if (sample.expiresAt <= now) return "trashed";
  return sample.shared || sample.tokenHash || sample.legacyTokenHash ? "active" : "unshared";
}
export function sampleTrashDeadline(sample: SampleLifecycle) {
  return sample.trashedAt != null ? sample.trashedAt + SAMPLE_RETENTION_MS : !sample.migratedAt ? sample.expiresAt + SAMPLE_RETENTION_MS : null;
}
export function readSampleProvenance(value: unknown): SampleProvenance | null {
  return typeof value === "string" && SAMPLE_PROVENANCES.some(item => item === value) ? value as SampleProvenance : null;
}
export function sampleCookiePath(id:string) { return `/muestra/${id}`; }
export function sampleLink(id:string,token:string) { return `/muestra/${id}#${token}`; }

// Never persist review tokens, passwords, CSRF data or arbitrary form fields.
const fields=new Set(("type tier handle display_name region city comuna short_description description contact_whatsapp contact_telegram contact_phone contact_email reference_location legacy_schedule currency price_amount price_30_min price_60_min price_moment price_night gender age nationality skin_color languages height_cm weight_kg measurements hair_color body_type bust_size instagram_url arsmate_url onlyfans_url promotions contact_methods travel_city travel_start travel_end travel_note services_included services_additional tags").split(" "));
const allowed=(key:string)=>fields.has(key)||/^availability_(mon|tue|wed|thu|fri|sat|sun)_(enabled|opens|closes)$/.test(key);
export function sampleFormJson(form:FormData) {
  const entries=[...form].filter((entry):entry is [string,string]=>typeof entry[1]==="string"&&allowed(entry[0])).map(([key,value])=>[key,value.slice(0,key==="description"?4000:key==="promotions"?500:180)]);
  if(entries.length>200)throw new Error("Demasiados campos.");
  return JSON.stringify(entries);
}
export function sampleForm(json:string) {
  const entries:unknown=JSON.parse(json),form=new FormData();
  if(!Array.isArray(entries)||entries.length>200)throw new Error("Muestra no válida.");
  for(const entry of entries) {
    if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=="string"||typeof entry[1]!=="string"||!allowed(entry[0]))throw new Error("Muestra no válida.");
    form.append(entry[0],entry[1]);
  }
  form.set("type","escort");form.set("intent","submit");return form;
}
