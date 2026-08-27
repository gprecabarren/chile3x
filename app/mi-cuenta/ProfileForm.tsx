"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { regions } from "@/app/locations";
import {
  additionalServices,
  availabilityDays,
  availabilityTimeOptions,
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

const tierVisibilityOptions = {
  gold: "Gold: visibilidad estándar (futura opción más económica) · GRATIS ahora",
  premium: "Premium: mayor visibilidad (futura opción intermedia) · GRATIS ahora",
  vip: "VIP: máxima visibilidad (futura opción más cara) · GRATIS ahora",
} as const;

type ProfileFormInitial = {
  type: ProfileType;
  handle?: string | null;
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
  allowEscort?: boolean;
};

function socialUsername(value: string) {
  if (!value) return "";
  try {
    return new URL(value).pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return value.replace(/^@/, "");
  }
}

function titleCase(value: string) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function profileTypeLabel(type: ProfileType) {
  return type === "escort" ? "Escort" : type === "agency" ? "Agencia" : "Arriendo";
}

function metadataValue(initial: ProfileFormInitial | undefined, key: string) {
  return initial?.details.metadata?.[key] ?? "";
}

export function ProfileForm({ action, submitLabel, initial, allowEscort = true }: ProfileFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const storageKey = `chile3x-profile-draft:${action}`;
  const availableProfileTypes = useMemo(() => profileTypes.filter((item) => initial || allowEscort || item !== "escort"), [allowEscort, initial]);
  const [type, setType] = useState<ProfileType>(initial?.type ?? (allowEscort ? "escort" : "agency"));
  const [region, setRegion] = useState(initial?.region ?? regions[0].title);
  const availableCities = useMemo(
    () => regions.find((item) => item.title === region)?.cities ?? [],
    [region],
  );
  const [city, setCity] = useState(initial?.city ?? availableCities[0] ?? "");
  const savedAvailability = useMemo(() => new Map(readAvailability(metadataValue(initial, "availability")).map((item) => [item.key, item])), [initial]);
  const [enabledAvailabilityDays, setEnabledAvailabilityDays] = useState(() => new Set(savedAvailability.keys()));
  const [selectedProfileTags, setSelectedProfileTags] = useState<string[]>(initial?.tags ?? []);
  const [underageNotice, setUnderageNotice] = useState(false);
  const typeLocked = Boolean(initial);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (!query.get("error")) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw || !formRef.current) return;
    let saved: Record<string, string[]>;
    try {
      saved = JSON.parse(raw) as Record<string, string[]>;
    } catch {
      return;
    }

    const savedType = saved.type?.[0];
    const savedRegion = saved.region?.[0];
    const savedCity = saved.city?.[0];

    const restore = window.requestAnimationFrame(() => {
      if (!typeLocked && savedType && availableProfileTypes.includes(savedType as ProfileType)) setType(savedType as ProfileType);
      if (savedRegion && regions.some((item) => item.title === savedRegion)) setRegion(savedRegion);
      if (savedCity) setCity(savedCity);
      setSelectedProfileTags((saved.tags ?? []).filter((tag) => profileTags.includes(tag)));
      setEnabledAvailabilityDays(new Set(availabilityDays.filter((day) => saved[`availability_${day.key}_enabled`]?.includes("on")).map((day) => day.key)));
      const form = formRef.current;
      if (!form) return;
      for (const [name, values] of Object.entries(saved)) {
        const fields = Array.from(form.elements).filter((element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
          "name" in element && (element as HTMLInputElement).name === name,
        );
        for (const field of fields) {
          if (field instanceof HTMLInputElement && field.type === "checkbox") {
            field.checked = values.includes(field.value);
          } else if (field instanceof HTMLSelectElement && field.multiple) {
            for (const option of Array.from(field.options)) option.selected = values.includes(option.value);
          } else if (!(field instanceof HTMLInputElement && field.type === "file")) {
            field.value = values[0] ?? "";
          }
        }
      }
    });
    return () => window.cancelAnimationFrame(restore);
  }, [availableProfileTypes, storageKey, typeLocked]);

  function saveFormBeforeSubmit(form: HTMLFormElement) {
    const saved: Record<string, string[]> = {};
    for (const [name, value] of new FormData(form).entries()) {
      if (typeof value !== "string") continue;
      (saved[name] ??= []).push(value);
    }
    window.sessionStorage.setItem(storageKey, JSON.stringify(saved));
  }

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
    <form ref={formRef} action={action} method="post" className="profile-form" onSubmit={(event) => {
      saveFormBeforeSubmit(event.currentTarget);
      const form = event.currentTarget;
      const age = Number(new FormData(form).get("age") || 0);
      if (type === "escort" && age > 0 && age < 18) {
        event.preventDefault();
        setUnderageNotice(true);
      }
    }}>
      <section className="profile-form-section">
        <div className="profile-form-section-heading">
          <p>01 · TIPO DE PUBLICACIÓN</p>
          <h2>Define tu anuncio</h2>
        </div>
        <div className="form-grid form-grid-three">
          <label>
            Tipo de anuncio
            {typeLocked ? <><input name="type" type="hidden" value={type} /><span className="profile-type-locked"><strong>{profileTypeLabel(type)}</strong><small>El tipo queda definido al crear el anuncio. Para otro tipo, crea una publicación nueva.</small></span></> : <select name="type" value={type} onChange={(event) => setType(event.target.value as ProfileType)}>
              {availableProfileTypes.map((item) => <option key={item} value={item}>{profileTypeLabel(item)}</option>)}
            </select>}
            {!typeLocked && !allowEscort && <small>Esta cuenta ya tiene un anuncio Escort. Puedes crear agencias o arriendos adicionales.</small>}
          </label>
          <label>
            Nombre visible
            <input name="display_name" required minLength={2} maxLength={80} defaultValue={initial?.displayName} placeholder={type === "agency" ? "Ej. Agencia Luna" : type === "rental" ? "Ej. Habitación en Providencia" : "Ej. Valentina Spa"} />
          </label>
          <label>
            Usuario del anuncio (opcional)
            <span className="profile-handle-input"><b>@</b><input name="handle" minLength={3} maxLength={41} defaultValue={initial?.handle ?? ""} placeholder={type === "agency" ? "agenciaejemplo" : type === "rental" ? "arriendo-centro" : "tu-nombre"} autoCapitalize="none" autoCorrect="off" /></span>
            <small>Será parte de tu enlace. Si lo dejas vacío, Chile3X crea uno único basado en el nombre del anuncio.</small>
          </label>
          {type === "escort" ? <label>
            Categoría de visibilidad
            <select name="tier" defaultValue={initial?.tier ?? "gold"}>
              {tiers.map((tier) => <option key={tier} value={tier}>{tierVisibilityOptions[tier]}</option>)}
            </select>
            <small>Por lanzamiento, todas las categorías son gratis. Sus valores se definirán más adelante.</small>
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
              {regions.map((item) => <option key={item.id} value={item.title}>{item.displayTitle}</option>)}
            </select>
          </label>
          <label>
            Ciudad
            <select name="city" value={city} onChange={(event) => setCity(event.target.value)} required disabled={availableCities.length === 0}>
              {availableCities.length === 0 ? <option value="">Apertura territorial próxima</option> : availableCities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Comuna o barrio (opcional)
            <input name="comuna" maxLength={80} defaultValue={initial?.comuna} placeholder="Ej. El Golf" />
          </label>
        </div>
        <label className="form-wide-label">
          Ubicación referencial (opcional)
          <input name="reference_location" maxLength={120} defaultValue={initial?.details.referenceLocation} placeholder="Ej. Cerca de Metro Los Leones, sin dirección exacta" />
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
            <input name="short_description" required maxLength={180} defaultValue={initial?.shortDescription} placeholder="Ej. Atención discreta, con agenda previa" />
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
                <label>Desde<select name={`availability_${day.key}_opens`} disabled={!enabled} defaultValue={entry?.opensAt ?? ""} required={enabled}><option value="">Hora</option>{availabilityTimeOptions.map((time) => <option key={time.value} value={time.value}>{time.label}</option>)}</select></label>
                <label>Hasta<select name={`availability_${day.key}_closes`} disabled={!enabled} defaultValue={entry?.closesAt ?? ""} required={enabled}><option value="">Hora</option>{availabilityTimeOptions.map((time) => <option key={time.value} value={time.value}>{time.label}</option>)}</select></label>
              </div>;
            })}
          </div>
          {initial?.details.schedule && !savedAvailability.size && <small>Tu horario anterior (“{initial.details.schedule}”) se reemplazará al guardar rangos semanales.</small>}
        </fieldset>
        <label className="form-wide-label">
          Descripción completa
          <textarea name="description" required maxLength={4000} rows={7} defaultValue={initial?.description} placeholder="Ej. Cuenta tu experiencia, modalidad de atención y detalles útiles. No publiques datos personales sensibles." />
        </label>
      </section>

      {type === "escort" && (
        <section className="profile-form-section">
          <div className="profile-form-section-heading">
            <p>04 · DATOS DEL PERFIL</p>
            <h2>Características opcionales</h2>
          </div>
          <div className="form-grid form-grid-three">
            <label>Nombre artista (opcional)<input name="artist_name" maxLength={80} defaultValue={metadataValue(initial, "artist_name")} placeholder="Ej. Valentina" /></label>
            <label>Género (opcional)<select name="gender" defaultValue={metadataValue(initial, "gender")}><option value="">Seleccionar</option>{escortGenders.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Edad (opcional)<input name="age" type="number" min="18" defaultValue={metadataValue(initial, "age")} placeholder="Ej. 28" onChange={(event) => setUnderageNotice(Boolean(event.target.value && Number(event.target.value) < 18))} />{underageNotice && <small className="field-warning" role="alert">Solo se admiten publicaciones de personas mayores de 18 años.</small>}</label>
            <label>Nacionalidad (opcional)<select name="nationality" defaultValue={metadataValue(initial, "nationality")}><option value="">Seleccionar</option>{nationalities.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Color de piel (opcional)<select name="skin_color" defaultValue={metadataValue(initial, "skin_color")}><option value="">Seleccionar</option>{skinColors.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="language-selector">Idiomas (opcional)<select name="languages" multiple size={4} defaultValue={metadataValue(initial, "languages").split(", ").filter(Boolean)}>{spokenLanguages.map((language) => <option key={language} value={language}>{language}</option>)}</select><small>Selecciona uno o más idiomas.</small></label>
            <label>Estatura (cm, opcional)<input name="height_cm" type="number" min="0" defaultValue={metadataValue(initial, "height_cm")} placeholder="Ej. 165" /></label>
            <label>Peso (kg, opcional)<input name="weight_kg" type="number" min="0" defaultValue={metadataValue(initial, "weight_kg")} placeholder="Ej. 58" /></label>
            <label>Medidas corporales (opcional)<input name="measurements" maxLength={50} defaultValue={metadataValue(initial, "measurements")} placeholder="Ej. 90-60-90" /></label>
            <label>Color de pelo (opcional)<select name="hair_color" defaultValue={metadataValue(initial, "hair_color")}><option value="">Seleccionar</option>{hairColors.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Tipo de cuerpo (opcional)<select name="body_type" defaultValue={metadataValue(initial, "body_type")}><option value="">Seleccionar</option>{bodyTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Tamaño de busto (opcional)<select name="bust_size" defaultValue={metadataValue(initial, "bust_size")}><option value="">Seleccionar</option>{bustSizes.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <fieldset className="language-checklist"><legend>Idiomas (opcional)</legend><p>Marca todos los idiomas que puedes atender.</p><div className="check-grid">{spokenLanguages.map((language) => <label key={language}><input name="languages" type="checkbox" value={language} defaultChecked={metadataValue(initial, "languages").split(", ").includes(language)} />{language}</label>)}</div></fieldset>
          <fieldset className="travel-agenda-editor"><legend>Agenda de viajes (opcional)</legend><p>Informa una visita temporal a otra ciudad. Tu anuncio seguirá perteneciendo a su ciudad habitual.</p><div className="form-grid form-grid-two">
            <label>Ciudad del próximo viaje (opcional)<select name="travel_city" defaultValue={metadataValue(initial, "travel_city")}><option value="">Sin viaje programado</option>{regions.map((item) => <optgroup label={item.displayTitle} key={item.title}>{item.cities.map((travelCity) => <option value={travelCity} key={travelCity}>{travelCity}</option>)}</optgroup>)}</select></label>
            <label>Nota breve (opcional)<input name="travel_note" maxLength={180} defaultValue={metadataValue(initial, "travel_note")} placeholder="Ej. Agenda abierta durante esos días" /></label>
            <label>Desde (opcional)<input name="travel_start" type="date" defaultValue={metadataValue(initial, "travel_start")} /></label>
            <label>Hasta (opcional)<input name="travel_end" type="date" defaultValue={metadataValue(initial, "travel_end")} /></label>
          </div></fieldset>
        </section>
      )}

      {type === "agency" && (
        <section className="profile-form-section">
          <div className="profile-form-section-heading">
            <p>04 · DATOS DE AGENCIA</p>
            <h2>Información complementaria</h2>
          </div>
          <div className="form-grid form-grid-two">
            <label>Años en el mercado (opcional)<input name="agency_years" type="number" min="0" max="99" defaultValue={metadataValue(initial, "agency_years")} placeholder="Ej. 5" /></label>
            <label>Sitio web (opcional)<input name="website" type="url" maxLength={180} defaultValue={metadataValue(initial, "website")} placeholder="https://" /></label>
            <label>Facebook (opcional)<input name="facebook_url" type="url" maxLength={180} defaultValue={metadataValue(initial, "facebook_url")} placeholder="https://" /></label>
            <label>Usuario de Instagram (opcional)<input name="instagram_url" maxLength={64} defaultValue={socialUsername(metadataValue(initial, "instagram_url"))} placeholder="nombredeusuario" /></label>
            <label>Twitter/X (opcional)<input name="twitter_url" type="url" maxLength={180} defaultValue={metadataValue(initial, "twitter_url")} placeholder="https://" /></label>
            <label>Métodos preferidos (opcional)<input name="contact_methods" maxLength={120} defaultValue={metadataValue(initial, "contact_methods")} placeholder="WhatsApp, correo" /></label>
          </div>
          <label className="form-wide-label">Descuentos o promociones (opcional)<textarea name="promotions" maxLength={500} rows={3} defaultValue={metadataValue(initial, "promotions")} placeholder="Ej. Agenda semanal con cupos disponibles" /></label>
        </section>
      )}

      {type === "rental" && (
        <section className="profile-form-section">
          <div className="profile-form-section-heading">
            <p>04 · DATOS DEL ARRIENDO</p>
            <h2>Características principales</h2>
          </div>
          <div className="form-grid form-grid-three">
            <label>Tipo de habitación (opcional)<select name="room_type" defaultValue={metadataValue(initial, "room_type")}><option value="">Seleccionar</option><option value="individual">Individual</option><option value="compartida">Compartida</option></select></label>
            <label>Amoblada (opcional)<select name="furnished" defaultValue={metadataValue(initial, "furnished")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Baño privado (opcional)<select name="private_bathroom" defaultValue={metadataValue(initial, "private_bathroom")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Ventana al exterior (opcional)<select name="exterior_window" defaultValue={metadataValue(initial, "exterior_window")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Tamaño (m², opcional)<input name="room_size" type="number" min="0" defaultValue={metadataValue(initial, "room_size")} placeholder="Ej. 18" /></label>
            <label>Gastos comunes incluidos (opcional)<select name="common_expenses" defaultValue={metadataValue(initial, "common_expenses")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Depósito/garantía (opcional)<input name="deposit" inputMode="numeric" type="number" min="0" defaultValue={metadataValue(initial, "deposit")} placeholder="Ej. 100000" /></label>
            <label>Duración mínima (opcional)<select name="minimum_rental" defaultValue={metadataValue(initial, "minimum_rental")}><option value="">Seleccionar</option><option value="semanas">Semanas</option><option value="meses">Meses</option></select></label>
            <label>Disponibilidad inmediata (opcional)<select name="immediate_available" defaultValue={metadataValue(initial, "immediate_available")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Internet/Wi-Fi (opcional)<select name="wifi" defaultValue={metadataValue(initial, "wifi")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Agua, luz y gas (opcional)<select name="utilities_included" defaultValue={metadataValue(initial, "utilities_included")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Uso de cocina (opcional)<select name="kitchen" defaultValue={metadataValue(initial, "kitchen")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
            <label>Lavadora/secadora (opcional)<select name="laundry" defaultValue={metadataValue(initial, "laundry")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
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
            <label>Teléfono alternativo (opcional)<input name="contact_phone" inputMode="numeric" pattern="[0-9]{8,15}" defaultValue={initial?.details.contactPhone} placeholder="Ej. 56912345678" /></label>
          <label>Telegram (opcional)<input name="contact_telegram" maxLength={80} defaultValue={initial?.contactTelegram} placeholder="@usuario o t.me/usuario" /><small>Puedes ingresar usuario, @usuario o un enlace t.me.</small></label>
          <label>Correo de contacto (opcional)<input name="contact_email" type="email" maxLength={160} defaultValue={initial?.details.contactEmail} placeholder="Ej. contacto@correo.cl" /></label>
        </div>
        </fieldset>
        <fieldset className="profile-contact-fieldset">
          <legend>Redes y plataformas</legend>
          <div className="form-grid form-grid-three">
            {type !== "agency" && <label>Usuario de Instagram (opcional)<input name="instagram_url" maxLength={64} defaultValue={socialUsername(metadataValue(initial, "instagram_url"))} placeholder="nombredeusuario" /><small>Se enlazará a instagram.com/tuusuario.</small></label>}
            <label>Usuario de Arsmate (opcional)<input name="arsmate_url" maxLength={64} defaultValue={socialUsername(metadataValue(initial, "arsmate_url"))} placeholder="nombredeusuario" /><small>Se enlazará a arsmate.com/tuusuario.</small></label>
            <label>Usuario de OnlyFans (opcional)<input name="onlyfans_url" maxLength={64} defaultValue={socialUsername(metadataValue(initial, "onlyfans_url"))} placeholder="nombredeusuario" /><small>Se enlazará a onlyfans.com/tuusuario.</small></label>
          </div>
        </fieldset>
        {type === "escort" && <fieldset>
          <legend>Etiquetas complementarias (opcional)</legend>
          <div className="check-grid">
            {profileTags.map((tag) => {
              const blocked = (tag === "milf" && selectedProfileTags.includes("trans")) || (tag === "trans" && selectedProfileTags.includes("milf"));
              return <label key={tag} className={blocked ? "is-blocked" : ""}><input name="tags" type="checkbox" value={tag} checked={selectedProfileTags.includes(tag)} disabled={blocked} onChange={() => toggleProfileTag(tag)} />{titleCase(tag)}</label>;
            })}
          </div>
        </fieldset>}
        <div className="service-columns">
          <fieldset>
            <legend>Servicios incluidos (opcional)</legend>
            <div className="check-grid">
              {includedServices.map((service) => <label key={service}><input name="services_included" type="checkbox" value={service} defaultChecked={initial?.servicesIncluded.includes(service)} />{service}</label>)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Servicios adicionales (opcional)</legend>
            <div className="check-grid">
              {additionalServices.map((service) => <label key={service}><input name="services_additional" type="checkbox" value={service} defaultChecked={initial?.servicesAdditional.includes(service)} />{service}</label>)}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="profile-media-notice" aria-label="Estado de carga de fotos y videos">
        <strong>Galería y videos</strong>
        <p>Guarda el perfil y luego administra hasta 10 fotos desde la edición. Cada imagen puede pesar hasta 5 MB y pasa por revisión antes de verse públicamente. Los videos siguen desactivados para proteger la cuota inicial. Si eres escort, después de guardar podrás adjuntar por separado tu carnet o examen médico privado (JPG, PNG, WebP o PDF de hasta 15 MB).</p>
      </section>

      <div className="profile-form-actions">
        <button className="button button-outline" name="intent" type="submit" value="draft">Guardar borrador</button>
        <button className="button button-primary" name="intent" type="submit" value="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
