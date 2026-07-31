import { cityDirectory } from "@/app/locations";
import { defaultBirthDate, maximumBirthDate } from "@/lib/account-data";

export function AccountIdentityFields() {
  return <>
    <div className="form-grid form-grid-two">
      <label>Nombre legal (opcional)<input name="first_name" maxLength={80} autoComplete="given-name" /></label>
      <label>Apellido legal (opcional)<input name="last_name" maxLength={80} autoComplete="family-name" /></label>
      <label>Tipo de documento<select name="document_type" defaultValue="rut"><option value="rut">RUT chileno</option><option value="foreign">Documento extranjero</option></select></label>
      <label>Número de documento<input name="document_number" required maxLength={40} autoComplete="off" placeholder="Ej. 12.345.678-5" /><small>El RUT se valida; para documento extranjero ingresa el número tal como aparece en él.</small></label>
      <label>Fecha de nacimiento<input name="birth_date" type="date" required defaultValue={defaultBirthDate} max={maximumBirthDate()} autoComplete="bday" /></label>
      <label>Ciudad<select name="account_city" required defaultValue=""><option value="" disabled>Selecciona una ciudad</option>{cityDirectory.map((entry) => <option key={entry.citySlug} value={entry.city}>{entry.city} · {entry.region.replace("Región ", "")}</option>)}</select></label>
      <label>Teléfono (opcional)<input name="phone" type="tel" inputMode="tel" maxLength={18} autoComplete="tel" placeholder="+56912345678" /></label>
    </div>
  </>;
}
