"use client";

import { useState } from "react";
import { cityDirectory } from "@/app/locations";
import { defaultBirthDate, foreignCountries, maximumBirthDate } from "@/lib/account-data";

type AccountIdentityValues = {
  fullName?: string | null;
  documentType?: "rut" | "foreign";
  documentNumber?: string | null;
  foreignCountry?: string | null;
  birthDate?: string | null;
  city?: string | null;
  phone?: string | null;
};

export function AccountIdentityFields({ values, birthDateReadOnly = false }: { values?: AccountIdentityValues; birthDateReadOnly?: boolean }) {
  const [documentType, setDocumentType] = useState<"rut" | "foreign">(values?.documentType ?? "rut");
  return <div className="form-grid form-grid-two">
    <label className="form-grid-full">Nombre completo (opcional)<input name="full_name" maxLength={160} autoComplete="name" defaultValue={values?.fullName ?? ""} /></label>
    <label>Tipo de documento (opcional)<select name="document_type" value={documentType} onChange={(event) => setDocumentType(event.target.value as "rut" | "foreign")}><option value="rut">RUT chileno</option><option value="foreign">Documento extranjero</option></select></label>
    <label>Número de documento (opcional)<input name="document_number" maxLength={40} autoComplete="off" defaultValue={values?.documentNumber ?? ""} placeholder={documentType === "rut" ? "Ej. 12.345.678-5" : "Tal como aparece en el documento"} /><small>{documentType === "rut" ? "Si lo ingresas, el RUT se valida." : "Ingresa el número tal como aparece en el documento."}</small></label>
    {documentType === "foreign" && <label className="form-grid-full">País emisor del documento (obligatorio si ingresas documento extranjero)<select name="foreign_country" defaultValue={values?.foreignCountry ?? ""}><option value="" disabled>Selecciona un país</option>{foreignCountries.map((country) => <option key={country} value={country}>{country}</option>)}</select><small>Esto solo identifica el documento. Tu ciudad de publicación sigue siendo una ciudad de Chile.</small></label>}
    <label>Fecha de nacimiento<input name="birth_date" type="date" required readOnly={birthDateReadOnly} defaultValue={values?.birthDate ?? defaultBirthDate} max={maximumBirthDate()} autoComplete="bday" /><small>{birthDateReadOnly ? "Para corregir tu fecha de nacimiento, contacta a soporte." : "Debes ser mayor de 18 años."}</small></label>
    <label>Ciudad<select name="account_city" required defaultValue={values?.city ?? ""}><option value="" disabled>Selecciona una ciudad</option>{cityDirectory.map((entry) => <option key={entry.citySlug} value={entry.city}>{entry.city} · {entry.regionDisplay}</option>)}</select></label>
    <label>Teléfono (opcional)<input name="phone" type="tel" inputMode="tel" maxLength={18} autoComplete="tel" defaultValue={values?.phone ?? ""} placeholder="+56912345678" /></label>
  </div>;
}
