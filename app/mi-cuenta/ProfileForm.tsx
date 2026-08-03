"use client";

import { useMemo, useState } from "react";
import { regions } from "@/app/locations";
import {
  additionalServices,
  availabilityDays,
  bodyTypes,
  bustSizes,
  escortGenders,
  hairColors,
  includedServices,
  nationalities,
  profileTags,
  profileTypes,
  readAvailability,
  skinColors,
  spokenLanguages,
  tiers,
  type ProfileType,
} from "@/lib/profile";

type ProfileFormInitial = {
  type: ProfileType;
  displayName: string;
  region: string;
  city: string;
  comuna: string;
  shortDescription: string;
  description: string;
  contactWhatsapp: string;
  contactTelegram: string;
  tier: string;
  details: {
    contactPhone?: string;
    contactEmail?: string;
    referenceLocation?: string;
    schedule?: string;
    priceAmount?: number | null;
    currency?: string;
    metadata?: Record<string, string>;
  };
  tags: string[];
  servicesIncluded: string[];
  servicesAdditional: string[];
};

type ProfileFormProps = {
  action: string;
  submitLabel: string;
  initial?: ProfileFormInitial;
};

function metadataValue(initial: ProfileFormInitial | undefined, key: string) {
  return initial?.details.metadata?.[key] ?? "";
}

export function ProfileForm({ action, submitLabel, initial }: ProfileFormProps) {
  const [type, setType] = useState<ProfileType>(initial?.type ?? "escort");
  const [region, setRegion] = useState(initial?.region ?? regions[0].title);
  const availableCities = useMemo(
    () => regions.find((item) => item.title === region)?.cities ?? [],
    [region],
  );
  const [city, setCity] = useState(initial?.city ?? availableCities[0] ?? "");
  const savedAvailability = useMemo(() => new Map(readAvailability(metadataValue(initial, "availability")).map((item) => [item.key, item])), [initial]);
  const [enabledAvailabilityDays, setEnabledAvailabilityDays] = useState(() => new Set(savedAvailability.keys()));
  const [selectedProfileTags, setSelectedProfileTags] = useState<string[]>(initial?.tags ?? []);

  function onRegionChange(nextRegion: string) {
    setRegion(nextRegion);
    setCity(regions.find((item) => item.title === nextRegion)?.cities[0] ?? "");
  }

  function toggleProfileTag(tag: string) {
    setSelectedProfileTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (tag === "milf") return [...current.filter((item) => item !== "trans"), tag];
      if (tag === "trans") return [...current.filter((item) => item !== "milf"), tag];
      return [...current, tag];
    });
  }

  return (
    <form action={action} method="post" className="profile-form" encType="multipart/form-data">
      <section className="profile-form-section">
        <div className="profile-form-section-heading">
          <p>01 · TIPO DE PUBLICACIÓN</p>
          <h2>Define tu perfil</h2>
        </div>
        <div className="form-grid form-grid-three">
          <label>
            Tipo de perfil
            <select name="type" value={type} onChange={(event) => setType(event.target.value as ProfileType)}>
              {profileTypes.map((item) => <option key={item} value={item}>{item === "escort" ? "Escort" : item === "agency" ? "Agencia" : "Arriendo"}</option>)}
            </select>
          </label>
          <label>
            Nombre visible
            <input name="display_name" required minLength={2} maxLength={80} defaultValue={initial?.displayName} placeholder={type === "agency" ? "Nombre de la agencia" : type === "rental" ? "Ej. Habitación en Providencia" : "Nombre de fantasía"} />
          </label>
          {type === "escort" ? <label>
            Categoría de visibilidad
            <select name="tier" defaultValue={initial?.tier ?? "gold"}>
              {tiers.map((tier) => <option key={tier} value={tier}>{tier === "gold" ? "Gold" : tier === "premium" ? "Premium" : "VIP"}</option>)}
            </select>
          </label> : <input name="tier" type="hidden" value="gold" />}
        </div>
      </section>

      <section className="profile-form-section">
        <div className="profile-form-section-heading">
          <p>02 · UBICACIÓN</p>
          <h2>Indica dónde se publica</h2>
        </div>
        <div className="form-grid form-grid-three">
          <label>
            Región
            <select name="region" value={region} onChange={(event) => onRegionChange(event.target.value)}>
              {regions.map((item) => <option key={item.id} value={item.title}>{item.title}</option>)}
            </select>
          </label>
          <label>
            Ciudad
            <select name="city" value={city} onChange={(event) => setCity(event.target.value)} required disabled={availableCities.length === 0}>
              {availableCities.length === 0 ? <option value="">Apertura territorial próxima</option> : availableCities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Comuna o barrio
            <input name="comuna" maxLength={80} defaultValue={initial?.comuna} placeholder="Ej. El Golf" />
          </label>
        </div>
        <label className="form-wide-label">
          Ubicación referencial
          <input name="reference_location" maxLength={120} defaultValue={initial?.details.referenceLocation} placeholder="No incluyas direcciones exactas" />
        </label>
      </section>

      <section className="profile-form-section">
        <div className="profile-form-section-heading">
          <p>03 · INFORMACIÓN PÚBLICA</p>
          <h2>Cuenta lo esencial</h2>
        </div>
        <div className="form-grid form-grid-two">
          <label>
            Descripción breve
            <input name="short_description" required maxLength={180} defaultValue={initial?.shortDescription} placeholder="Una frase para tu aviso" />
          </label>
          {type === "escort" ? <>
            <label>
              Valor por 30 minutos (opcional)
              <input name="price_30_min" inputMode="numeric" min="1" type="number" defaultValue={metadataValue(initial, "price_30_min")} placeholder="Ej. 30000" />
            </label>
            <label>
              Valor por 1 hora (opcional)
              <input name="price_60_min" inputMode="numeric" min="1" type="number" defaultValue={metadataValue(initial, "price_60_min")} placeholder="Ej. 50000" />
            </label>
            <label>
              Valor por momento (opcional)
              <input name="price_moment" inputMode="numeric" min="1" type="number" defaultValue={metadataValue(initial, "price_moment")} placeholder="Ej. 20000" />
            </label>
            <label>
              Valor por noche (opcional)
              <input name="price_night" inputMode="numeric" min="1" type="number" defaultValue={metadataValue(initial, "price_night")} placeholder="Ej. 150000" />
            </label>
          </> : <label>
            {type === "rental" ? "Valor mensual (opcional)" : "Valor referencial (opcional)"}
            <input name="price_amount" inputMode="numeric" min="1" type="number" defaultValue={initial?.details.priceAmount ?? ""} placeholder={type === "rental" ? "Ej. 350000" : "Monto referencial"} />
          </label>}
          <label>
            Moneda
            <select name="currency" defaultValue={initial?.details.currency ?? "CLP"}>
              <option value="CLP">CLP · Pesos chilenos</option>
              <option value="USD">USD · Dólares</option>
            </select>
          </label>
        </div>
        <fieldset className="availability-editor">
          <legend>Horarios de disponibilidad (opcional)</legend>
          <p>Activa solo los días en que atiendes. En el perfil se indicará claramente si está disponible ahora, usando la hora de Chile.</p>
          <div className="availability-editor-grid">
            {availabilityDays.map((day) => {
              const entry = savedAvailability.get(day.key);
              const enabled = enabledAvailabilityDays.has(day.key);
              return <div className={`availability-editor-row${enabled ? " is-enabled" : ""}`} key={day.key}>
                <label className="availability-day-toggle"><input name={`availability_${day.key}_enabled`} type="checkbox" checked={enabled} onChange={() => setEnabledAvailabilityDays((current) => {
                  const next = new Set(current);
                  if (next.has(day.key)) next.delete(day.key); else next.add(day.key);
                  return next;
                })} />{day.label}</label>
                <label>Desde<input name={`availability_${day.key}_opens`} type="time" disabled={!enabled} defaultValue={entry?.opensAt ?? ""} /></label>
                <label>Hasta<input name={`availability_${day.key}_closes`} type="time" disabled={!enabled} defaultValue={entry?.closesAt ?? ""} /></label>
              </div>;
            })}
          </div>
          {initial?.details.schedule && !savedAvailability.size && <small>Tu horario anterior (“{initial.details.schedule}”) se reemplazará al guardar rangos semanales.</small>}
        </fieldset>
        <label className="form-wide-label">
          Descripción completa
          <textarea name="description" required maxLength={4000} rows={7} defaultValue={initial?.description} placeholder="Describe tu aviso con claridad. No publiques datos personales sensibles." />
        </label>
      </section>

      {type === "escort" && (
        <section className="profile-form-section">
          <div className="profile-form-section-heading">
            <p>04 · DATOS DEL PERFIL</p>
            <h2>Características opcionales</h2>
          </div>
          <div className="form-grid form-grid-three">
            <label>Nombre artista (opcional)<input name="artist_name" maxLength={80} defaultValue={metadataValue(initial, "artist_name")} /></label>
            <label>Género<select name="gender" defaultValue={metadataValue(initial, "gender")}><option value="">Seleccionar</option>{escortGenders.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Edad<input name="age" type="number" min="18" defaultValue={metadataValue(initial, "age")} /></label>
            <label>Nacionalidad<select name="nationality" defaultValue={metadataValue(initial, "nationality")}><option value="">Seleccionar</option>{nationalities.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Color de piel<select name="skin_color" defaultValue={metadataValue(initial, "skin_color")}><option value="">Seleccionar</option>{skinColors.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="language-selector">Idiomas<select name="languages" multiple size={4} defaultValue={metadataValue(initial, "languages").split(", ").filter(Boolean)}>{spokenLanguages.map((language) => <option key={language} value={language}>{language}</option>)}</select><small>Selecciona uno o más idiomas.</small></label>
            <label>Estatura (cm)<input name="height_cm" type="number" min="0" defaultValue={metadataValue(initial, "height_cm")} /></label>
            <label>Peso (kg)<input name="weight_kg" type="number" min="0" defaultValue={metadataValue(initial, "weight_kg")} /></label>
            <label>Medidas corporales<input name="measurements" maxLength={50} defaultValue={metadataValue(initial, "measurements")} placeholder="Busto - cintura - cadera" /></label>
            <label>Color de pelo<select name="hair_color" defaultValue={metadataValue(initial, "hair_color")}><option value="">Seleccionar</option>{hairColors.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Tipo de cuerpo<select name="body_type" defaultValue={metadataValue(initial, "body_type")}><option value="">Seleccionar</option>{bodyTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Tamaño de busto<select name="bust_size" defaultValue={metadataValue(initial, "bust_size")}><option value="">Seleccionar</option>{bustSizes.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <fieldset className="language-checklist"><legend>Idiomas</legend><p>Marca todos los idiomas que puedes atender.</p><div className="check-grid">{spokenLanguages.map((language) => <label key={language}><input name="languages" type="checkbox" value={language} defaultChecked={metadataValue(initial, "languages").split(", ").includes(language)} />{language}</label>)}</div></fieldset>
          <fieldset className="travel-agenda-editor"><legend>Agenda de viajes (opcional)</legend><p>Informa una visita temporal a otra ciudad. Tu anuncio seguirá perteneciendo a su ciudad habitual.</p><div className="form-grid form-grid-two">
            <label>Ciudad del próximo viaje<select name="travel_city" defaultValue={metadataValue(initial, "travel_city")}><option value="">Sin viaje programado</option>{regions.map((item) => <optgroup label={item.title} key={item.title}>{item.cities.map((travelCity) => <option value={travelCity} key={travelCity}>{travelCity}</option>)}</optgroup>)}</select></label>
            <label>Nota breve<input name="travel_note" maxLength={180} defaultValue={metadataValue(initial, "travel_note")} placeholder="Ej. Agenda abierta durante esos días" /></label>
            <label>Desde<input name="travel_start" type="date" defaultValue={metadataValue(initial, "travel_start")} /></label>
            <label>Hasta<input name="travel_end" type="date" defaultValue={metadataValue(initial, "travel_end")} /></label>
          </div></fieldset>
        </section>
      )}

      {type === "escort" && (
        <section className="profile-form-section verification-documents-section">
          <div className="profile-form-section-heading"><p>05 · VERIFICACIÓN OPCIONAL</p><h2>Documentos privados</h2></div>
          <p className="profile-form-help">Puedes adjuntar imágenes de tu carnet y examen médico. Son opcionales, no se publican y solo pueden revisarlos tú y administradores autorizados. Un archivo nuevo reemplaza y elimina el anterior.</p>
          <div className="form-grid form-grid-two">
            <label>Importar carnet (opcional)<input name="identity_document" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" /><small>JPG, PNG o WebP; máximo 5 MB.</small></label>
            <label>Importar examen médico (opcional)<input name="medical_certificate" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" /><small>JPG, PNG o WebP; máximo 5 MB.</small></label>
          </div>
        </section>
      )}

      {type === "agency" && (
        <section className="profile-form-section">
          <div className="profile-form-section-heading">
            <p>04 · DATOS DE AGENCIA</p>
            <h2>Información complementaria</h2>
          </div>
          <div className="form-grid form-grid-two">
            <label>Años en el mercado<input name="agency_years" type="number" min="0" max="99" defaultValue={metadataValue(initial, "agency_years")} /></label>
            <label>Sitio web (opcional)<input name="website" type="url" maxLength={180} defaultValue={metadataValue(initial, "website")} placeholder="https://" /></label>
            <label>Facebook (opcional)<input name="facebook_url" type="url" maxLength={180} defaultValue={metadataValue(initial, "facebook_url")} placeholder="https://" /></label>
            <label>Instagram (opcional)<input name="instagram_url" type="url" maxLength={180} defaultValue={metadataValue(initial, "instagram_url")} placeholder="https://" /></label>
            <label>Twitter/X (opcional)<input name="twitter_url" type="url" maxLength={180} defaultValue={metadataValue(initial, "twitter_url")} placeholder="https://" /></label>
            <label>Métodos preferidos<input name="contact_methods" maxLength={120} defaultValue={metadataValue(initial, "contact_methods")} placeholder="WhatsApp, correo" /></label>
          </div>
          <label className="form-wide-label">Descuentos o promociones<textarea name="promotions" maxLength={500} rows={3} defaultValue={metadataValue(initial, "promotions")} /></label>
        </section>
      )}

      {type === "rental" && (
        <section className="profile-form-section">
          <div className="profile-form-section-heading">
            <p>04 · DATOS DEL ARRIENDO</p>
            <h2>Características principales</h2>
          </div>
          <div className="form-grid form-grid-three">
            <label>Tipo de habitación<select name="room_type" defaultValue={metadataValue(initial, "room_type")}><option value="">Seleccionar</option><option value="individual">Individual</option><option value="compartida">Compartida</option></select></label>
            <label>Amoblada<select name="furnished" defaultValue={metadataValue(initial, "furnished")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Baño privado<select name="private_bathroom" defaultValue={metadataValue(initial, "private_bathroom")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Ventana al exterior<select name="exterior_window" defaultValue={metadataValue(initial, "exterior_window")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Tamaño (m²)<input name="room_size" type="number" min="0" defaultValue={metadataValue(initial, "room_size")} /></label>
            <label>Gastos comunes incluidos<select name="common_expenses" defaultValue={metadataValue(initial, "common_expenses")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Depósito/garantía<input name="deposit" inputMode="numeric" type="number" min="0" defaultValue={metadataValue(initial, "deposit")} /></label>
            <label>Duración mínima<select name="minimum_rental" defaultValue={metadataValue(initial, "minimum_rental")}><option value="">Seleccionar</option><option value="semanas">Semanas</option><option value="meses">Meses</option></select></label>
            <label>Disponibilidad inmediata<select name="immediate_available" defaultValue={metadataValue(initial, "immediate_available")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Internet/Wi-Fi<select name="wifi" defaultValue={metadataValue(initial, "wifi")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Agua, luz y gas<select name="utilities_included" defaultValue={metadataValue(initial, "utilities_included")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Uso de cocina<select name="kitchen" defaultValue={metadataValue(initial, "kitchen")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Lavadora/secadora<select name="laundry" defaultValue={metadataValue(initial, "laundry")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
          </div>
        </section>
      )}

      <section className="profile-form-section">
        <div className="profile-form-section-heading">
          <p>05 · CONTACTO, REDES Y SERVICIOS</p>
          <h2>Cómo te pueden encontrar</h2>
        </div>
        <p className="profile-form-help">Completa solo los medios que deseas mostrar. Debes dejar al menos un método de contacto o red social pública.</p>
        <fieldset className="profile-contact-fieldset">
          <legend>Contacto directo</legend>
        <div className="form-grid form-grid-three">
          <label>WhatsApp público<input name="contact_whatsapp" required inputMode="numeric" pattern="[0-9]{8,15}" defaultValue={initial?.contactWhatsapp} placeholder="56912345678" /></label>
          <label>Teléfono alternativo<input name="contact_phone" inputMode="numeric" pattern="[0-9]{8,15}" defaultValue={initial?.details.contactPhone} /></label>
          <label>Telegram (opcional)<input name="contact_telegram" maxLength={80} defaultValue={initial?.contactTelegram} placeholder="@usuario" /></label>
          <label>Correo de contacto (opcional)<input name="contact_email" type="email" maxLength={160} defaultValue={initial?.details.contactEmail} /></label>
        </div>
        </fieldset>
        <fieldset className="profile-contact-fieldset">
          <legend>Redes y plataformas</legend>
          <div className="form-grid form-grid-three">
            {type !== "agency" && <label>Instagram (opcional)<input name="instagram_url" maxLength={180} defaultValue={metadataValue(initial, "instagram_url")} placeholder="@usuario o https://instagram.com/..." /></label>}
            <label>Arsmate (opcional)<input name="arsmate_url" type="url" maxLength={180} defaultValue={metadataValue(initial, "arsmate_url")} placeholder="https://arsmate.com/..." /></label>
          </div>
        </fieldset>
        {type === "escort" && <fieldset>
          <legend>Etiquetas complementarias</legend>
          <div className="check-grid">
            {profileTags.map((tag) => {
              const blocked = (tag === "milf" && selectedProfileTags.includes("trans")) || (tag === "trans" && selectedProfileTags.includes("milf"));
              return <label key={tag} className={blocked ? "is-blocked" : ""}><input name="tags" type="checkbox" value={tag} checked={selectedProfileTags.includes(tag)} disabled={blocked} onChange={() => toggleProfileTag(tag)} />{tag}</label>;
            })}
          </div>
        </fieldset>}
        <div className="service-columns">
          <fieldset>
            <legend>Servicios incluidos</legend>
            <div className="check-grid">
              {includedServices.map((service) => <label key={service}><input name="services_included" type="checkbox" value={service} defaultChecked={initial?.servicesIncluded.includes(service)} />{service}</label>)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Servicios adicionales</legend>
            <div className="check-grid">
              {additionalServices.map((service) => <label key={service}><input name="services_additional" type="checkbox" value={service} defaultChecked={initial?.servicesAdditional.includes(service)} />{service}</label>)}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="profile-media-notice" aria-label="Estado de carga de fotos y videos">
        <strong>Galería y videos</strong>
        <p>Guarda el perfil y luego administra hasta 10 fotos desde la edición. Cada imagen puede pesar hasta 5 MB y pasa por revisión antes de verse públicamente. Los videos siguen desactivados para proteger la cuota inicial. Los documentos opcionales se almacenan de forma privada y nunca se muestran en el perfil público.</p>
      </section>

      <div className="profile-form-actions">
        <button className="button button-outline" name="intent" type="submit" value="draft">Guardar borrador</button>
        <button className="button button-primary" name="intent" type="submit" value="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
