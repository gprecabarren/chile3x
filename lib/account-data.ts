import { isValidAccountLocation, normalizeAccountCity } from "@/lib/account-locations";

export const defaultBirthDate = "2000-01-01";

export type AccountIdentityInput = {
  firstName: string;
  lastName: string;
  documentType: "rut" | "foreign";
  documentNumber: string;
  foreignCountry: string;
  birthDate: string;
  city: string;
  phone: string;
};

function asString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validRut(value: string) {
  const compact = value.replaceAll(/[.\s-]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(compact)) {
    return false;
  }

  const digits = compact.slice(0, -1);
  const provided = compact.at(-1);
  let sum = 0;
  let factor = 2;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    sum += Number(digits[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return provided === expected;
}

export function normalizeRut(value: string) {
  const compact = value.replaceAll(/[.\s-]/g, "").toUpperCase();
  return `${compact.slice(0, -1)}-${compact.at(-1)}`;
}

function validBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) return false;
  return value >= "1900-01-01" && value <= maximumBirthDate();
}

export function maximumBirthDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => Number(parts.find(part => part.type === type)?.value);
  const year = value("year") - 18, month = value("month") - 1;
  const max = new Date(Date.UTC(year, month, Math.min(value("day"), new Date(Date.UTC(year, month + 1, 0)).getUTCDate())));
  return max.toISOString().slice(0, 10);
}

export const foreignCountries = [
  "Argentina", "Bolivia", "Brasil", "Colombia", "Cuba", "Ecuador", "España", "Estados Unidos", "Haití", "México", "Paraguay", "Perú", "República Dominicana", "Uruguay", "Venezuela", "Otro",
] as const;

export function readAccountDocument(form: FormData): Pick<AccountIdentityInput,"documentType"|"documentNumber"|"foreignCountry"> | null {
  const documentType = asString(form,"document_type"), raw = asString(form,"document_number"), foreignCountry = asString(form,"foreign_country");
  if (documentType !== "rut" && documentType !== "foreign") return null;
  if (!raw) return { documentType, documentNumber: "", foreignCountry: "" };
  if (raw.length > 40) return null;
  if (documentType === "rut") return validRut(raw) ? { documentType, documentNumber: normalizeRut(raw), foreignCountry: "" } : null;
  if (!/^[\p{L}\p{N} ./-]{3,40}$/u.test(raw) || !foreignCountries.includes(foreignCountry as typeof foreignCountries[number])) return null;
  return { documentType, documentNumber: raw, foreignCountry };
}

export function readAccountIdentity(formData: FormData): AccountIdentityInput | null {
  const documentType = asString(formData, "document_type");
  const rawDocument = asString(formData, "document_number");
  const foreignCountry = asString(formData, "foreign_country").slice(0, 80);
  const birthDate = asString(formData, "birth_date");
  const region = asString(formData, "account_region");
  const city = normalizeAccountCity(asString(formData, "account_city"));
  // El teléfono es opcional y puede tener formatos internacionales variados.
  // Solo lo limitamos en longitud para almacenarlo con seguridad.
  const phone = asString(formData, "phone").slice(0, 40);
  // The legacy `firstName` column stores one optional full legal name.
  const firstName = asString(formData, "full_name").slice(0, 160);
  const lastName = "";

  // La residencia administrativa de una cuenta puede estar en cualquier comuna del país.
  // La cobertura permitida de cada anuncio se valida por separado en sus propios formularios.
  if ((documentType !== "rut" && documentType !== "foreign") || !validBirthDate(birthDate) || !isValidAccountLocation(region, city)) {
    return null;
  }

  if (!rawDocument) {
    return { firstName, lastName, documentType, documentNumber: "", foreignCountry: "", birthDate, city, phone };
  }

  if (documentType === "rut") {
    if (!validRut(rawDocument)) return null;
    return { firstName, lastName, documentType, documentNumber: normalizeRut(rawDocument), foreignCountry: "", birthDate, city, phone };
  }

  const documentNumber = rawDocument.slice(0, 40);
  if (!/^[\p{L}\p{N} ./-]{3,40}$/u.test(documentNumber) || !foreignCountries.includes(foreignCountry as (typeof foreignCountries)[number])) return null;
  return { firstName, lastName, documentType, documentNumber, foreignCountry, birthDate, city, phone };
}
