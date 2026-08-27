"use client";

import { useState } from "react";
import { defaultBirthDate, foreignCountries, maximumBirthDate } from "@/lib/account-data";
import { accountLocationRegions, getAccountLocationRegionByCity, normalizeAccountCity } from "@/lib/account-locations";

type AccountIdentityValues = {
  fullName?: string | null;
  documentType?: "rut" | "foreign";
  documentNumber?: string | null;
  foreignCountry?: string | null;
  birthDate?: string | null;
  region?: string | null;
  city?: string | null;
  phone?: string | null;
};

export function AccountIdentityFields({ values, birthDateReadOnly = false }: { values?: AccountIdentityValues; birthDateReadOnly?: boolean }) {
  const [documentType, setDocumentType] = useState<"rut" | "foreign">(values?.documentType ?? "rut");
  const savedCity = normalizeAccountCity(values?.city);
  const savedRegion = accountLocationRegions.some((region) => region.title === values?.region)
    ? values?.region ?? ""
    : getAccountLocationRegionByCity(savedCity)?.title ?? "";
  const [region, setRegion] = useState(savedRegion);
  const [city, setCity] = useState(savedCity);
  const cities = accountLocationRegions.find((entry) => entry.title === region)?.cities ?? [];

  return <>
    <div className="account-identity-required">
      <label>Fecha de nacimiento<input name="birth_date" type="date" required readOnly={birthDateReadOnly} defaultValue={values?.birthDate ?? defaultBirthDate} max={maximumBirthDate()} autoComplete="bday" /><small>{birthDateReadOnly ? "Para corregir tu fecha de nacimiento, contacta a soporte." : "Debes ser mayor de 18 años."}</small></label>
      <div className="form-grid form-grid-two account-location-grid">
        <label>Región<select name="account_region" required value={region} onChange={(event) => { setRegion(event.target.value); setCity(""); }}><option value="" disabled>Selecciona una región</option>{accountLocationRegions.map((entry) => <option key={entry.id} value={entry.title}>{entry.displayTitle}</option>)}</select></label>
        <label>Ciudad o comuna<select name="account_city" required value={city} onChange={(event) => setCity(event.target.value)} disabled={!region}><option value="" disabled>{region ? "Selecciona una ciudad o comuna" : "Primero selecciona una región"}</option>{cities.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
      </div>
      <p className="account-identity-note">La ubicación de tu cuenta es administrativa y no determina dónde se publican tus anuncios.</p>
    </div>
    <fieldset className="account-identity-optional"><legend>Datos opcionales</legend><p>Agrega solo lo que quieras registrar ahora. Tus anuncios se configuran por separado y mantienen su propia cobertura.</p><div className="form-grid form-grid-two">
      <label className="form-grid-full">Nombre completo (opcional)<input name="full_name" maxLength={160} autoComplete="name" defaultValue={values?.fullName ?? ""} placeholder="Ej. Daniela Rojas" /></label>
      <label>Tipo de documento (opcional)<select name="document_type" value={documentType} onChange={(event) => setDocumentType(event.target.value as "rut" | "foreign")}><option value="rut">RUT chileno</option><option value="foreign">Documento extranjero</option></select></label>
      <label>Número de documento (opcional)<input name="document_number" maxLength={40} autoComplete="off" defaultValue={values?.documentNumber ?? ""} placeholder={documentType === "rut" ? "Ej. 12.345.678-5" : "Tal como aparece en el documento"} /><small>{documentType === "rut" ? "Si lo ingresas, el RUT se valida." : "Ingresa el número tal como aparece en el documento."}</small></label>
      {documentType === "foreign" && <label className="form-grid-full">País emisor del documento (obligatorio si ingresas documento extranjero)<select name="foreign_country" defaultValue={values?.foreignCountry ?? ""}><option value="" disabled>Selecciona un país</option>{foreignCountries.map((country) => <option key={country} value={country}>{country}</option>)}</select></label>}
      <label>Teléfono (opcional)<input name="phone" type="tel" inputMode="tel" maxLength={18} autoComplete="tel" defaultValue={values?.phone ?? ""} placeholder="Ej. +56912345678" /></label>
    </div></fieldset>
  </>;
}
