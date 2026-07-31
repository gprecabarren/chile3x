import { cityDirectory } from "@/app/locations";
import { defaultBirthDate, maximumBirthDate } from "@/lib/account-data";

type AccountIdentityValues = {
  fullName?: string | null;
  documentType?: "rut" | "foreign";
  documentNumber?: string | null;
  birthDate?: string | null;
  city?: string | null;
  phone?: string | null;
};

export function AccountIdentityFields({ values, birthDateReadOnly = false }: { values?: AccountIdentityValues; birthDateReadOnly?: boolean }) {
  return <div className="form-grid form-grid-two">
    <label className="form-grid-full">Nombre completo (opcional)<input name="full_name" maxLength={160} autoComplete="name" defaultValue={values?.fullName ?? ""} /></label>
    <label>Tipo de documento<select name="document_type" defaultValue={values?.documentType ?? "rut"}><option value="rut">RUT chileno</option><option value="foreign">Documento extranjero</option></select></label>
    <label>Número de documento<input name="document_number" required maxLength={40} autoComplete="off" defaultValue={values?.documentNumber ?? ""} placeholder="Ej. 12.345.678-5" /><small>El RUT se valida; para documento extranjero ingresa el número tal como aparece en él.</small></label>
    <label>Fecha de nacimiento<input name="birth_date" type="date" required readOnly={birthDateReadOnly} defaultValue={values?.birthDate ?? defaultBirthDate} max={maximumBirthDate()} autoComplete="bday" /><small>{birthDateReadOnly ? "Para corregir tu fecha de nacimiento, contacta a soporte." : "Debes ser mayor de 18 años."}</small></label>
    <label>Ciudad<select name="account_city" required defaultValue={values?.city ?? ""}><option value="" disabled>Selecciona una ciudad</option>{cityDirectory.map((entry) => <option key={entry.citySlug} value={entry.city}>{entry.city} · {entry.region.replace("Región ", "")}</option>)}</select></label>
    <label>Teléfono (opcional)<input name="phone" type="tel" inputMode="tel" maxLength={18} autoComplete="tel" defaultValue={values?.phone ?? ""} placeholder="+56912345678" /></label>
  </div>;
}
