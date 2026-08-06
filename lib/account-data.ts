import { cityDirectory } from "@/app/locations";

export const defaultBirthDate = "1990-01-01";

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
  const today = new Date();
  const adultLimit = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  return parsed <= adultLimit;
}

export function maximumBirthDate() {
  const today = new Date();
  const max = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  return max.toISOString().slice(0, 10);
}

export const foreignCountries = [
  "Argentina", "Bolivia", "Brasil", "Colombia", "Cuba", "Ecuador", "España", "Estados Unidos", "Haití", "México", "Paraguay", "Perú", "República Dominicana", "Uruguay", "Venezuela", "Otro",
] as const;

export function readAccountIdentity(formData: FormData): AccountIdentityInput | null {
  const documentType = asString(formData, "document_type");
  const rawDocument = asString(formData, "document_number");
  const foreignCountry = asString(formData, "foreign_country").slice(0, 80);
  const birthDate = asString(formData, "birth_date") || defaultBirthDate;
  const city = asString(formData, "account_city");
  // El teléfono es opcional y puede tener formatos internacionales variados.
  // Solo lo limitamos en longitud para almacenarlo con seguridad.
  const phone = asString(formData, "phone").slice(0, 40);
  // The legacy `firstName` column stores one optional full legal name.
  const firstName = asString(formData, "full_name").slice(0, 160);
  const lastName = "";

  if ((documentType !== "rut" && documentType !== "foreign") || !validBirthDate(birthDate) || !cityDirectory.some((item) => item.city === city)) {
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
