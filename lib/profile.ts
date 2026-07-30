import { regions } from "@/app/locations";

export const profileTypes = ["escort", "agency", "rental"] as const;
export const tiers = ["gold", "premium", "vip"] as const;
export const profileTags = ["milf", "hombres", "trans", "masajes"] as const;
export const includedServices = ["Departamento propio", "Hoteles", "Domicilio", "Acompañamiento", "Videollamada"] as const;
export const additionalServices = ["Traslado", "Viajes", "Noche completa", "Atención fuera de horario"] as const;

export type ProfileType = (typeof profileTypes)[number];
export type Tier = (typeof tiers)[number];

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
