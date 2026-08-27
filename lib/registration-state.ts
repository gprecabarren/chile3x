export const registrationStateCookie = "chile3x_registration_state";

export type RegistrationState = {
  displayName: string;
  fullName: string;
  documentType: "rut" | "foreign";
  documentNumber: string;
  foreignCountry: string;
  birthDate: string;
  region: string;
  city: string;
  phone: string;
  email: string;
  adultConfirmed: boolean;
  legalConfirmed: boolean;
};

function field(formData: FormData, name: string, maxLength: number) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function registrationStateFromForm(formData: FormData): RegistrationState {
  const documentType = field(formData, "document_type", 20) === "foreign" ? "foreign" : "rut";
  return {
    displayName: field(formData, "display_name", 80),
    fullName: field(formData, "full_name", 160),
    documentType,
    documentNumber: field(formData, "document_number", 40),
    foreignCountry: field(formData, "foreign_country", 80),
    birthDate: field(formData, "birth_date", 10),
    region: field(formData, "account_region", 160),
    city: field(formData, "account_city", 120),
    phone: field(formData, "phone", 40),
    email: field(formData, "email", 160),
    adultConfirmed: formData.get("adult_confirmed") === "yes",
    legalConfirmed: formData.get("legal_confirmed") === "yes",
  };
}

export function encodeRegistrationState(state: RegistrationState) {
  return encodeURIComponent(JSON.stringify(state));
}

export function decodeRegistrationState(value: string | undefined): RegistrationState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<RegistrationState>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "",
      fullName: typeof parsed.fullName === "string" ? parsed.fullName : "",
      documentType: parsed.documentType === "foreign" ? "foreign" : "rut",
      documentNumber: typeof parsed.documentNumber === "string" ? parsed.documentNumber : "",
      foreignCountry: typeof parsed.foreignCountry === "string" ? parsed.foreignCountry : "",
      birthDate: typeof parsed.birthDate === "string" ? parsed.birthDate : "",
      region: typeof parsed.region === "string" ? parsed.region : "",
      city: typeof parsed.city === "string" ? parsed.city : "",
      phone: typeof parsed.phone === "string" ? parsed.phone : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      adultConfirmed: parsed.adultConfirmed === true,
      legalConfirmed: parsed.legalConfirmed === true,
    };
  } catch {
    return null;
  }
}
