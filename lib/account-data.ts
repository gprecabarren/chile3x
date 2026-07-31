import { cityDirectory } from "@/app/locations";

export const defaultBirthDate = "1990-01-01";

export type AccountIdentityInput = {
  firstName: string;
  lastName: string;
  documentType: "rut" | "foreign";
  documentNumber: string;
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

function normalizeRut(value: string) {
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

export function readAccountIdentity(formData: FormData): AccountIdentityInput | null {
  const documentType = asString(formData, "document_type");
  const rawDocument = asString(formData, "document_number");
  const birthDate = asString(formData, "birth_date") || defaultBirthDate;
  const city = asString(formData, "account_city");
  const phone = asString(formData, "phone").replaceAll(/[\s()-]/g, "");
  // The legacy `firstName` column stores one optional full legal name.
  const firstName = asString(formData, "full_name").slice(0, 160);
  const lastName = "";

  if ((documentType !== "rut" && documentType !== "foreign") || !validBirthDate(birthDate) || !cityDirectory.some((item) => item.city === city)) {
    return null;
  }

  if (phone && !/^\+?[0-9]{8,15}$/.test(phone)) return null;

  if (documentType === "rut") {
    if (!validRut(rawDocument)) return null;
    return { firstName, lastName, documentType, documentNumber: normalizeRut(rawDocument), birthDate, city, phone };
  }

  const documentNumber = rawDocument.slice(0, 40);
  if (!/^[\p{L}\p{N} ./-]{3,40}$/u.test(documentNumber)) return null;
  return { firstName, lastName, documentType, documentNumber, birthDate, city, phone };
}
