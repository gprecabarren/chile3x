import { regions } from "@/app/locations";

export const profileTypes = ["escort", "agency", "rental"] as const;
export const tiers = ["gold", "premium", "vip"] as const;
export const profileTags = ["milf", "hombres", "trans", "masajes"] as const;
export const includedServices = [
  "Departamento propio",
  "Hoteles",
  "Domicilio",
  "Acompañamiento",
  "Videollamada",
  "Americana corporal",
  "Atención a parejas",
  "Bailes eróticos",
  "Besos",
  "Despedidas",
  "Eventos y cenas",
  "Fantasías y disfraces",
  "Juguetes eróticos",
  "Masaje erótico",
  "Oral con preservativo",
  "Trato de pareja",
] as const;
export const additionalServices = [
  "Traslado",
  "Viajes",
  "Noche completa",
  "Atención fuera de horario",
  "Amiga para un trío",
  "Ducha erótica",
  "Garganta profunda",
  "Lluvia dorada",
  "Masturbación rusa",
  "Oral natural",
  "Sexo anal",
  "Fetiches",
  "Fetiche de pies",
  "BDSM suave",
  "Dominación",
  "Sumisión",
  "Juego de roles",
  "Lencería y disfraces",
] as const;
export const escortGenders = ["Femenino", "Masculino", "No binario", "Trans"] as const;
export const nationalities = ["Chilena", "Argentina", "Boliviana", "Brasileña", "Colombiana", "Ecuatoriana", "Peruana", "Venezolana", "Otra"] as const;
export const skinColors = ["Clara", "Trigueña", "Morena", "Oscura"] as const;
export const hairColors = ["Rubio", "Castaño", "Negro", "Rojo", "Otro"] as const;
export const bodyTypes = ["Delgada", "Atlética", "Curvilínea", "Grande", "Otro"] as const;
export const bustSizes = ["Pequeño", "Medio", "Grande", "No aplica"] as const;
export const spokenLanguages = ["Español", "Inglés", "Portugués", "Francés", "Italiano", "Alemán", "Otro"] as const;

export const availabilityDays = [
  { key: "mon", label: "Lunes", shortLabel: "Lun" },
  { key: "tue", label: "Martes", shortLabel: "Mar" },
  { key: "wed", label: "Miércoles", shortLabel: "Mié" },
  { key: "thu", label: "Jueves", shortLabel: "Jue" },
  { key: "fri", label: "Viernes", shortLabel: "Vie" },
  { key: "sat", label: "Sábado", shortLabel: "Sáb" },
  { key: "sun", label: "Domingo", shortLabel: "Dom" },
] as const;

export type AvailabilityDayKey = (typeof availabilityDays)[number]["key"];
export type AvailabilityEntry = {
  key: AvailabilityDayKey;
  label: string;
  shortLabel: string;
  opensAt: string;
  closesAt: string;
};

export type ProfileType = (typeof profileTypes)[number];
export type Tier = (typeof tiers)[number];

export const tagLabels: Record<(typeof profileTags)[number], string> = {
  milf: "MILF",
  hombres: "Hombres",
  trans: "TRANS",
  masajes: "Masajes",
};

export const tierLabels: Record<Tier, string> = {
  gold: "Gold",
  premium: "Premium",
  vip: "VIP",
};

export const citiesByRegion = new Map(regions.map((region) => [region.title, region.cities]));

export function isProfileType(value: string): value is ProfileType {
  return profileTypes.includes(value as ProfileType);
}

export function isTier(value: string): value is Tier {
  return tiers.includes(value as Tier);
}

export function isAllowedLocation(region: string, city: string) {
  return citiesByRegion.get(region)?.includes(city) ?? false;
}

export function listFromForm(values: FormDataEntryValue[], allowed: readonly string[]) {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && allowed.includes(value)))];
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52) || "perfil";
}

const reservedProfileHandles = new Set([
  "admin", "agencias", "api", "arriendos", "contacto", "escorts", "faq", "historias", "ingresar", "media", "mi-cuenta", "noticias", "perfil", "privacidad", "quienes-somos", "registro", "reglas-de-publicacion", "robots", "sitemap", "terminos",
]);

/**
 * Normalizes the public identity of a listing. Handles are deliberately kept
 * separate from account identities: one account can own several listings,
 * each with its own @handle and public URL.
 */
export function normalizeProfileHandle(value: string) {
  return slugify(value.replace(/^@+/, "")).slice(0, 40).replace(/^-+|-+$/g, "");
}

export function validateProfileHandle(value: string) {
  const normalized = normalizeProfileHandle(value);
  if (normalized.length < 3) {
    throw new Error("El usuario del anuncio debe tener al menos 3 caracteres.");
  }
  if (reservedProfileHandles.has(normalized)) {
    throw new Error("Ese usuario del anuncio está reservado. Elige otro.");
  }
  return normalized;
}

export function profilePublicPath({ handle, slug }: { handle?: string | null; slug: string }) {
  return handle ? `/perfil/@${encodeURIComponent(handle)}` : `/perfil/${slug}`;
}

export function citySlug(value: string) {
  return slugify(value);
}

export function compactText(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

export function longText(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function optionalPositiveInteger(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function isTime(value: string | null | undefined) {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
  return true;
}

function timeAsMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/** A compact format keeps the weekly range in the existing metadata column. */
export function readAvailability(value: string | null | undefined): AvailabilityEntry[] {
  const ranges = new Map(
    (value ?? "")
      .split("|")
      .map((item) => item.split("="))
      .filter((item): item is [string, string] => item.length === 2),
  );

  return availabilityDays.flatMap((day) => {
    const [opensAt, closesAt] = (ranges.get(day.key) ?? "").split("-");
    if (!isTime(opensAt) || !isTime(closesAt) || timeAsMinutes(opensAt) >= timeAsMinutes(closesAt)) {
      return [];
    }
    return [{ ...day, opensAt, closesAt }];
  });
}

export function serializeAvailability(formData: FormData) {
  return availabilityDays.flatMap((day) => {
    if (formData.get(`availability_${day.key}_enabled`) !== "on") return [];
    const opensAt = compactText(formData.get(`availability_${day.key}_opens`), 5);
    const closesAt = compactText(formData.get(`availability_${day.key}_closes`), 5);
    if (!isTime(opensAt) || !isTime(closesAt) || timeAsMinutes(opensAt) >= timeAsMinutes(closesAt)) return [];
    return [`${day.key}=${opensAt}-${closesAt}`];
  }).join("|");
}

export function getAvailabilityStatus(entries: AvailabilityEntry[], date = new Date()) {
  if (!entries.length) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const weekdays: Record<string, AvailabilityDayKey> = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };
  const currentKey = weekdays[part("weekday")];
  const currentMinutes = timeAsMinutes(`${part("hour")}:${part("minute")}`);
  const today = entries.find((entry) => entry.key === currentKey);

  if (today && currentMinutes >= timeAsMinutes(today.opensAt) && currentMinutes < timeAsMinutes(today.closesAt)) {
    return { isOpen: true, text: `Disponible ahora · hasta las ${today.closesAt}` };
  }

  const currentIndex = availabilityDays.findIndex((day) => day.key === currentKey);
  for (let offset = 0; offset < availabilityDays.length; offset += 1) {
    const day = availabilityDays[(currentIndex + offset) % availabilityDays.length];
    const entry = entries.find((item) => item.key === day.key);
    if (!entry) continue;
    if (offset === 0 && currentMinutes >= timeAsMinutes(entry.opensAt)) continue;
    return { isOpen: false, text: `No disponible ahora · abre ${offset === 0 ? "hoy" : day.label.toLowerCase()} a las ${entry.opensAt}` };
  }
  return null;
}

export type ProfilePrice = { label: string; amount: number; currency: string };

export function readProfilePrices(details: { metadata: Record<string, string>; priceAmount: number | null; currency: string }): ProfilePrice[] {
  const prices = [
    ["30 min", details.metadata.price_30_min],
    ["1 hora", details.metadata.price_60_min],
    ["Por momento", details.metadata.price_moment],
    ["Por noche", details.metadata.price_night],
  ] as const;
  const parsed = prices.flatMap(([label, value]) => {
    const amount = Number(value);
    return Number.isSafeInteger(amount) && amount > 0 ? [{ label, amount, currency: details.currency }] : [];
  });
  return parsed.length || details.priceAmount === null
    ? parsed
    : [{ label: "Tarifa informada", amount: details.priceAmount, currency: details.currency }];
}
