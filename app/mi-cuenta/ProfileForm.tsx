"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DateField } from "@/app/DateField";
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
  tagLabels,
  tierLabels,
  type ProfileType,
} from "@/lib/profile";

const visibilityTiers = ["vip", "premium", "bronze"] as const;

const tierVisibilityOptions = {
  bronze: "Bronze: visibilidad estándar · GRATIS ahora",
  premium: "Premium: visibilidad intermedia · GRATIS ahora",
  vip: "VIP: máxima visibilidad · GRATIS ahora",
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
  adminAssisted?: boolean;
  adminEdit?: boolean;
};

function socialUsername(value: string) {
  if (!value) return "";
  try {
    return new URL(value).pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return value.replace(/^@/, "");
  }
}

function profileTypeLabel(type: ProfileType) {
  return type === "escort" ? "Escort" : type === "agency" ? "Agencia" : "Arriendo";
}

function metadataValue(initial: ProfileFormInitial | undefined, key: string) {
  return initial?.details.metadata?.[key] ?? "";
}

export function ProfileForm({ action, submitLabel, initial, allowEscort = true, adminAssisted = false, adminEdit = false }: ProfileFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const optionalRef = useRef<HTMLDetailsElement>(null);
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
  const [availabilityHours, setAvailabilityHours] = useState<Record<string, { opens: string; closes: string }>>(() => Object.fromEntries(availabilityDays.map(day => [day.key, { opens: savedAvailability.get(day.key)?.opensAt ?? "", closes: savedAvailability.get(day.key)?.closesAt ?? "" }])));
  const previousAvailabilityHours = useRef<Record<string, { opens: string; closes: string }>>({});
  const allSelectedHours = enabledAvailabilityDays.size > 0 && [...enabledAvailabilityDays].every(key => availabilityHours[key]?.opens === "00:00" && availabilityHours[key]?.closes === "24:00");
  const [selectedProfileTags, setSelectedProfileTags] = useState<string[]>(initial?.tags ?? []);
  const [contentOnly, setContentOnly] = useState(metadataValue(initial, "content_only") === "1");
  const [selectedTier, setSelectedTier] = useState(initial?.tier ?? "vip");
  const [underageNotice, setUnderageNotice] = useState(false);
  const typeLocked = Boolean(initial);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (!query.get("error")) {
      window.sessionStorage.removeItem(storageKey);
      return;
    }

    if (optionalRef.current) optionalRef.current.open = true;
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

    let restoreFields = 0;
    const restore = window.requestAnimationFrame(() => {
      if (!typeLocked && savedType && availableProfileTypes.includes(savedType as ProfileType)) setType(savedType as ProfileType);
      if (savedRegion && regions.some((item) => item.title === savedRegion)) setRegion(savedRegion);
      if (savedCity) setCity(savedCity);
      setSelectedProfileTags((saved.tags ?? []).filter((tag) => profileTags.some((allowedTag) => allowedTag === tag)));
      setContentOnly(saved.content_only?.includes("on") ?? false);
      if (visibilityTiers.some(tier => tier === saved.tier?.[0])) setSelectedTier(saved.tier[0]);
      setEnabledAvailabilityDays(new Set(availabilityDays.filter((day) => saved[`availability_${day.key}_enabled`]?.includes("on")).map((day) => day.key)));
      setAvailabilityHours(Object.fromEntries(availabilityDays.map(day => [day.key, { opens: saved[`availability_${day.key}_opens`]?.[0] ?? "", closes: saved[`availability_${day.key}_closes`]?.[0] ?? "" }])));
      // Wait for the selected listing type to render its own fields before
      // restoring them (especially agency/rental after a server error).
      restoreFields = window.requestAnimationFrame(() => {
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
    });
    return () => { window.cancelAnimationFrame(restore); window.cancelAnimationFrame(restoreFields); };
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

  function toggleAllHours() {
    if (!enabledAvailabilityDays.size) return;
    if (!allSelectedHours) previousAvailabilityHours.current = { ...availabilityHours };
    setAvailabilityHours(current => Object.fromEntries(availabilityDays.map(day => [day.key, !enabledAvailabilityDays.has(day.key) ? current[day.key] : allSelectedHours ? previousAvailabilityHours.current[day.key] ?? { opens: "", closes: "" } : { opens: "00:00", closes: "24:00" }])));
  }

  return (
    <form ref={formRef} action={action} method="post" className="profile-form" onInvalidCapture={(event) => {
      // Native validation must be able to focus a field in the collapsed group.
      const field = event.target;
      if (field instanceof HTMLElement && field.closest(".profile-optional-fields") && optionalRef.current) optionalRef.current.open = true;
    }} onSubmit={(event) => {
      saveFormBeforeSubmit(event.currentTarget);
      const form = event.currentTarget;
      const age = Number(new FormData(form).get("age") || 0);
      if (type === "escort" && age > 0 && age < 18) {
        event.preventDefault();
        setUnderageNotice(true);
      }
    }}>
      <div className="profile-form-actions profile-form-actions-top">
        {!adminEdit && <button className="button button-outline" name="intent" type="submit" value="draft" formNoValidate>Guardar borrador</button>}
        <button className="button button-primary" name="intent" type="submit" value="submit">{submitLabel}</button>
      </div>
      <section className="profile-form-section">
        <div className="profile-form-section-heading">
          <p>01 · TIPO DE PUBLICACIÓN</p>
          <h2>Define tu anuncio</h2>
        </div>
        <div className="form-grid form-grid-two">
          <label>
            Tipo de anuncio
            {typeLocked ? <><input name="type" type="hidden" value={type} /><span className="profile-type-locked"><strong>{profileTypeLabel(type)}</strong><small>El tipo queda definido al crear el anuncio. Para otro tipo, crea una publicación nueva.</small></span></> : <select name="type" value={type} onChange={(event) => { setType(event.target.value as ProfileType); setContentOnly(false); }}>
              {availableProfileTypes.map((item) => <option key={item} value={item}>{profileTypeLabel(item)}</option>)}
            </select>}
            {!typeLocked && !allowEscort && <small>Ya tienes un Escort activo. Puedes crear varias agencias o arriendos.</small>}
          </label>
          <label>
            Nombre visible
            <input name="display_name" required minLength={2} maxLength={80} defaultValue={initial?.displayName} placeholder={type === "agency" ? "Ej. Agencia Luna" : type === "rental" ? "Ej. Habitación en Providencia" : "Ej. Valentina Masajes"} />
          </label>
          {type === "escort" && contentOnly && <input name="tier" type="hidden" value={selectedTier} />}
          {type === "escort" && !contentOnly && <div className="tier-form-field">
            <label>
              Categoría de visibilidad
              <select name="tier" value={selectedTier} onChange={event => setSelectedTier(event.target.value)}>
                {visibilityTiers.map((tier) => <option key={tier} value={tier}>{tierVisibilityOptions[tier]}</option>)}
              </select>
              <small>Por lanzamiento, todas las categorías son gratis. Sus valores se definirán más adelante.</small>
            </label>
            <div className="tier-form-guide" aria-label="Niveles de visibilidad">
              {visibilityTiers.map((tier) => <span key={tier} className={`tier-form-chip tier-${tier}`}>{tierLabels[tier]}</span>)}
            </div>
          </div>}
          <label>
            Usuario del anuncio (opcional)
            <span className="profile-handle-input"><b>@</b><input name="handle" minLength={3} maxLength={41} defaultValue={initial?.handle ?? ""} placeholder={type === "agency" ? "agenciaejemplo" : type === "rental" ? "arriendo-centro" : "tu-nombre"} autoCapitalize="none" autoCorrect="off" /></span>
            <small>Será parte de tu enlace. Si lo dejas vacío, Chile3X crea uno único basado en el nombre del anuncio.</small>
          </label>
          {type !== "escort" && <input name="tier" type="hidden" value="bronze" />}
        </div>
        {type === "escort" && <fieldset className="profile-content-mode">
          <legend>Modalidad del anuncio</legend>
          <label className="profile-content-only-toggle"><input type="checkbox" name="content_only" checked={contentOnly} onChange={event => {
            const only = event.target.checked;
            setContentOnly(only);
            if (only) setSelectedProfileTags(current => [...new Set([...current.filter(tag => tag !== "masajes"), "venta-contenido"])]);
          }} /><span><strong>Solo vendo contenido; no soy escort</strong><small>Mi anuncio aparecerá únicamente en Venta de contenido, sin etiqueta Escort ni categorías VIP, Premium, Bronze o Masajes.</small></span></label>
          <p>Si también eres escort, deja esta opción desmarcada y activa la etiqueta Venta contenido más abajo. Puedes vender por contacto directo o en otras plataformas; no necesitas una galería privada en Chile3X. Al guardar Solo contenido se retiran Masajes, los servicios presenciales, viajes y tarifas por tiempo.</p>
        </fieldset>}
      </section>

      <section className="profile-form-section">
        <div className="profile-form-section-heading">
          <p>02 · UBICACIÓN</p>
          <h2>Indica dónde se publica</h2>
        </div>
        <div className="form-grid form-grid-two">
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
          <label>
            Ubicación referencial (opcional)
            <input name="reference_location" maxLength={120} defaultValue={initial?.details.referenceLocation} placeholder="Ej. Cerca de Metro Los Leones" />
            <small>Indica una referencia de la zona, sin publicar tu dirección exacta.</small>
          </label>
        </div>
      </section>

      <section className="profile-form-section">
        <div className="profile-form-section-heading">
          <p>03 · INFORMACIÓN PÚBLICA</p>
          <h2>Cuenta lo esencial</h2>
        </div>
        <div className="form-grid form-grid-two">
          {type === "escort" && <>
            <label>Género (obligatorio)<select name="gender" required defaultValue={metadataValue(initial, "gender")}><option value="">Seleccionar</option>{escortGenders.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Edad (obligatoria)<input name="age" type="number" required min="18" max="99" step="1" inputMode="numeric" defaultValue={metadataValue(initial, "age")} placeholder="Ej. 28" onChange={(event) => setUnderageNotice(Boolean(event.target.value && Number(event.target.value) < 18))} /><small className={underageNotice ? "field-warning" : undefined} role={underageNotice ? "alert" : undefined}>{underageNotice ? "Solo se admiten publicaciones de personas mayores de 18 años." : "Debes tener al menos 18 años. Género y edad son obligatorios para enviar a revisión."}</small></label>
          </>}
          <label className="form-grid-full">
            Descripción breve
            <input name="short_description" required maxLength={180} defaultValue={initial?.shortDescription} placeholder="Ej. Atención discreta, con agenda previa" />
          </label>
        </div>
        <label className="form-wide-label">
          Descripción completa
          <textarea name="description" required maxLength={4000} rows={7} defaultValue={initial?.description} placeholder="Ej. Cuenta tu experiencia, modalidad de atención y detalles útiles. No publiques datos personales sensibles." />
        </label>
        {type === "escort" && <fieldset className="profile-tags-fieldset">
          <legend>Etiquetas complementarias (opcionales)</legend>
          <p>Selecciona solo las que correspondan a tu anuncio. Puedes dejarlas sin marcar.</p>
          <div className="check-grid">
            {profileTags.map((tag) => {
              const blocked = (tag === "milf" && selectedProfileTags.includes("trans")) || (tag === "trans" && selectedProfileTags.includes("milf")) || (contentOnly && (tag === "masajes" || tag === "venta-contenido"));
              return <label key={tag} className={blocked ? "is-blocked" : ""}><input name="tags" type="checkbox" value={tag} checked={(contentOnly && tag === "venta-contenido") || selectedProfileTags.includes(tag)} disabled={blocked} onChange={() => toggleProfileTag(tag)} />{tagLabels[tag]}</label>;
            })}
          </div>
        </fieldset>}
      </section>

      <section className="profile-form-section">
        <div className="profile-form-section-heading"><p>04 · CONTACTO PRINCIPAL</p><h2>Cómo te pueden contactar</h2></div>
        <div className="form-grid form-grid-two">
          <label>WhatsApp público<input name="contact_whatsapp" required inputMode="numeric" pattern="[0-9]{8,15}" defaultValue={initial?.contactWhatsapp} placeholder="56912345678" aria-describedby="profile-whatsapp-help" /><small id="profile-whatsapp-help">Ingresa el código de país y el número, sin + ni espacios.</small></label>
        </div>
        <p className="profile-form-help">Los demás contactos y redes están en Características opcionales.</p>
      </section>

      <details ref={optionalRef} className="profile-optional-fields">
        <summary><span><strong>Características opcionales</strong><small>Dale más fuerza a tu anuncio: completar sus características puede generar mayor confianza y ayudar a que te encuentren en los filtros del directorio.</small></span></summary>
        <div className="profile-optional-fields-content">
          <section className="profile-form-section">
            <div className="profile-form-section-heading"><p>VALORES Y DISPONIBILIDAD</p><h2>Tarifas y horarios</h2></div>
            <div className="form-grid form-grid-three">
              {type === "escort" && !contentOnly ? <>
                <label>
                  Valor por 30 minutos
                  <input name="price_30_min" inputMode="numeric" min="1" type="number" defaultValue={metadataValue(initial, "price_30_min")} placeholder="Ej. 30000" />
                </label>
                <label>
                  Valor por 1 hora
                  <input name="price_60_min" inputMode="numeric" min="1" type="number" defaultValue={metadataValue(initial, "price_60_min")} placeholder="Ej. 50000" />
                </label>
                <label>
                  Valor por momento
                  <input name="price_moment" inputMode="numeric" min="1" type="number" defaultValue={metadataValue(initial, "price_moment")} placeholder="Ej. 20000" />
                </label>
                <label>
                  Valor por noche
                  <input name="price_night" inputMode="numeric" min="1" type="number" defaultValue={metadataValue(initial, "price_night")} placeholder="Ej. 150000" />
                </label>
              </> : !contentOnly && <label>
                {type === "rental" ? "Valor mensual" : "Valor referencial"}
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
              {initial?.details.schedule && !savedAvailability.size && <input type="hidden" name="legacy_schedule" value={initial.details.schedule} />}
              <legend>Horarios de disponibilidad</legend>
              <p>{type === "escort" ? "Activa solo los días en que atiendes." : "Activa los días de disponibilidad del anuncio."} En el perfil se indicará si está disponible ahora, usando la hora de Chile.</p>
              <div className="availability-bulk-actions"><button className="button button-outline availability-toggle-all" type="button" aria-pressed={enabledAvailabilityDays.size === availabilityDays.length} onClick={() => setEnabledAvailabilityDays((current) => current.size === availabilityDays.length ? new Set() : new Set(availabilityDays.map((day) => day.key)))}>
                {enabledAvailabilityDays.size === availabilityDays.length ? "Desmarcar todos los días" : "Seleccionar todos los días"}
              </button>
              <button className="button button-outline" type="button" aria-pressed={allSelectedHours} disabled={!enabledAvailabilityDays.size} onClick={toggleAllHours}>{allSelectedHours ? "Restaurar horas anteriores" : "24 horas en días seleccionados"}</button></div>
              <small>Selecciona todos los días y luego 24 horas para atención 24/7. El botón de horas solo modifica los días activados; puedes restaurar el horario anterior.</small>
              <div className="availability-editor-grid">
                {availabilityDays.map((day) => {
                  const enabled = enabledAvailabilityDays.has(day.key);
                  return <div className={`availability-editor-row${enabled ? " is-enabled" : ""}`} key={day.key}>
                    <label className="availability-day-toggle"><input name={`availability_${day.key}_enabled`} type="checkbox" checked={enabled} onChange={() => setEnabledAvailabilityDays((current) => {
                      const next = new Set(current);
                      if (next.has(day.key)) next.delete(day.key); else next.add(day.key);
                      return next;
                    })} />{day.label}</label>
                    <label>Desde<select name={`availability_${day.key}_opens`} disabled={!enabled} value={availabilityHours[day.key].opens} onChange={event => setAvailabilityHours(current => ({ ...current, [day.key]: { ...current[day.key], opens: event.target.value } }))} required={enabled}><option value="">Hora</option>{availabilityTimeOptions.map((time) => <option key={time.value} value={time.value}>{time.label}</option>)}</select></label>
                    <label>Hasta<select name={`availability_${day.key}_closes`} disabled={!enabled} value={availabilityHours[day.key].closes} onChange={event => setAvailabilityHours(current => ({ ...current, [day.key]: { ...current[day.key], closes: event.target.value } }))} required={enabled}><option value="">Hora</option>{availabilityTimeOptions.map((time) => <option key={time.value} value={time.value}>{time.label}</option>)}<option value="24:00">Medianoche · fin del día</option></select></label>
                  </div>;
                })}
              </div>
              {initial?.details.schedule && !savedAvailability.size && <small>Tu horario anterior (“{initial.details.schedule}”) se reemplazará al guardar rangos semanales.</small>}
            </fieldset>
          </section>

          {type === "escort" && (
            <section className="profile-form-section">
              <div className="profile-form-section-heading">
                <p>DATOS DEL PERFIL</p>
                <h2>Información personal y apariencia</h2>
              </div>
              <div className="form-grid form-grid-three">

                <label>Nacionalidad<select name="nationality" defaultValue={metadataValue(initial, "nationality")}><option value="">Seleccionar</option>{nationalities.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Color de piel<select name="skin_color" defaultValue={metadataValue(initial, "skin_color")}><option value="">Seleccionar</option>{skinColors.map((item) => <option key={item}>{item}</option>)}</select></label>

                <label>Estatura (cm)<input name="height_cm" type="number" min="0" defaultValue={metadataValue(initial, "height_cm")} placeholder="Ej. 165" /></label>
                <label>Peso (kg)<input name="weight_kg" type="number" min="0" defaultValue={metadataValue(initial, "weight_kg")} placeholder="Ej. 58" /></label>
                <label>Medidas corporales<input name="measurements" maxLength={50} defaultValue={metadataValue(initial, "measurements")} placeholder="Ej. 90-60-90" /></label>
                <label>Color de pelo<select name="hair_color" defaultValue={metadataValue(initial, "hair_color")}><option value="">Seleccionar</option>{hairColors.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Tipo de cuerpo<select name="body_type" defaultValue={metadataValue(initial, "body_type")}><option value="">Seleccionar</option>{bodyTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label>Tamaño de busto<select name="bust_size" defaultValue={metadataValue(initial, "bust_size")}><option value="">Seleccionar</option>{bustSizes.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <fieldset className="language-checklist"><legend>Idiomas</legend><p>Marca todos los idiomas que puedes atender.</p><div className="check-grid">{spokenLanguages.map((language) => <label key={language}><input name="languages" type="checkbox" value={language} defaultChecked={metadataValue(initial, "languages").split(", ").includes(language)} />{language}</label>)}</div></fieldset>
              {!contentOnly && <fieldset className="travel-agenda-editor"><legend>Agenda de viajes</legend><p>Informa una visita temporal a otra ciudad. Tu anuncio seguirá perteneciendo a su ciudad habitual.</p><div className="form-grid form-grid-two">
                <label>Ciudad del próximo viaje<select name="travel_city" defaultValue={metadataValue(initial, "travel_city")}><option value="">Sin viaje programado</option>{regions.map((item) => <optgroup label={item.displayTitle} key={item.title}>{item.cities.map((travelCity) => <option value={travelCity} key={travelCity}>{travelCity}</option>)}</optgroup>)}</select></label>
                <label>Nota breve<input name="travel_note" maxLength={180} defaultValue={metadataValue(initial, "travel_note")} placeholder="Ej. Agenda abierta durante esos días" /></label>
                <DateField label="Desde" name="travel_start" defaultValue={metadataValue(initial, "travel_start")} />
                <DateField label="Hasta" name="travel_end" defaultValue={metadataValue(initial, "travel_end")} />
              </div></fieldset>}
            </section>
          )}

          {type === "agency" && (
            <section className="profile-form-section">
              <div className="profile-form-section-heading">
                <p>DATOS DE AGENCIA</p>
                <h2>Información complementaria</h2>
              </div>
              <div className="form-grid form-grid-two">
                <label>Años en el mercado<input name="agency_years" type="number" min="0" max="99" defaultValue={metadataValue(initial, "agency_years")} placeholder="Ej. 5" /></label>
              </div>
              <label className="form-wide-label">Descuentos o promociones<textarea name="promotions" maxLength={500} rows={3} defaultValue={metadataValue(initial, "promotions")} placeholder="Ej. Agenda semanal con cupos disponibles" /></label>
            </section>
          )}

          {type === "rental" && (
            <section className="profile-form-section">
              <div className="profile-form-section-heading">
                <p>DATOS DEL ARRIENDO</p>
                <h2>Características principales</h2>
              </div>
              <div className="form-grid form-grid-three">
                <label>Tipo de habitación<select name="room_type" defaultValue={metadataValue(initial, "room_type")}><option value="">Seleccionar</option><option value="individual">Individual</option><option value="compartida">Compartida</option></select></label>
                <label>Amoblada<select name="furnished" defaultValue={metadataValue(initial, "furnished")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
                <label>Baño privado<select name="private_bathroom" defaultValue={metadataValue(initial, "private_bathroom")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
                <label>Ventana al exterior<select name="exterior_window" defaultValue={metadataValue(initial, "exterior_window")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
                <label>Tamaño (m²)<input name="room_size" type="number" min="0" defaultValue={metadataValue(initial, "room_size")} placeholder="Ej. 18" /></label>
                <label>Gastos comunes incluidos<select name="common_expenses" defaultValue={metadataValue(initial, "common_expenses")}><option value="">Seleccionar</option><option value="si">Sí</option><option value="no">No</option></select></label>
                <label>Depósito/garantía<input name="deposit" inputMode="numeric" type="number" min="0" defaultValue={metadataValue(initial, "deposit")} placeholder="Ej. 100000" /></label>
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
              <p>CONTACTO Y SERVICIOS</p>
              <h2>{type === "rental" ? "Más formas de contacto" : "Más formas de contacto y servicios"}</h2>
            </div>
            <p className="profile-form-help">{type === "rental" ? "Agrega otros contactos o redes si lo deseas." : "Agrega otros contactos, redes o servicios si lo deseas."} Actualizar únicamente tus contactos o redes no retira un anuncio aprobado.</p>
            <fieldset className="profile-contact-fieldset">
              <legend>Contacto directo</legend>
            <div className="form-grid form-grid-three">
                <label>Teléfono alternativo<input name="contact_phone" inputMode="numeric" pattern="[0-9]{8,15}" defaultValue={initial?.details.contactPhone} placeholder="Ej. 56912345678" /></label>
              <label>Telegram<input name="contact_telegram" maxLength={80} defaultValue={initial?.contactTelegram} placeholder="@usuario o t.me/usuario" /><small>Puedes ingresar usuario, @usuario o un enlace t.me.</small></label>
              {type === "agency" && <>
                <label>Métodos preferidos<input name="contact_methods" maxLength={120} defaultValue={metadataValue(initial, "contact_methods")} placeholder="WhatsApp, correo" /></label>
              </>}
              <label>Correo de contacto<input name="contact_email" type="email" maxLength={160} defaultValue={initial?.details.contactEmail} placeholder="Ej. contacto@correo.cl" /></label>
            </div>
            </fieldset>
            <fieldset className="profile-contact-fieldset">
              <legend>Redes y plataformas</legend>
              <div className="form-grid form-grid-three">
                <label>Usuario de Instagram<input name="instagram_url" maxLength={64} defaultValue={socialUsername(metadataValue(initial, "instagram_url"))} placeholder="nombredeusuario" /><small>Se enlazará a instagram.com/tuusuario.</small></label>
                {type === "agency" && <>
                <label>Sitio web<input name="website" type="url" maxLength={180} defaultValue={metadataValue(initial, "website")} placeholder="https://" /></label>
                <label>Facebook<input name="facebook_url" type="url" maxLength={180} defaultValue={metadataValue(initial, "facebook_url")} placeholder="https://" /></label>
                <label>Twitter/X<input name="twitter_url" type="url" maxLength={180} defaultValue={metadataValue(initial, "twitter_url")} placeholder="https://" /></label>
                </>}
                {type !== "rental" && <><label>Usuario de Arsmate<input name="arsmate_url" maxLength={64} defaultValue={socialUsername(metadataValue(initial, "arsmate_url"))} placeholder="nombredeusuario" /><small>Se enlazará a arsmate.com/tuusuario.</small></label>
                <label>Usuario de OnlyFans<input name="onlyfans_url" maxLength={64} defaultValue={socialUsername(metadataValue(initial, "onlyfans_url"))} placeholder="nombredeusuario" /><small>Se enlazará a onlyfans.com/tuusuario.</small></label></>}
              </div>
            </fieldset>
            {type !== "rental" && !contentOnly && <div className="service-columns">
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
            </div>}
          </section>
        </div>
      </details>

      <section className="profile-media-notice" aria-label="Estado de carga de fotos y videos">
        <strong>Galería y videos</strong>
        <p>{adminEdit ? "Este formulario guarda los datos del anuncio sin cambiar su estado de publicación o verificación. Los medios y documentos se gestionan por separado desde los accesos de esta página." : initial ? "Las fotos y videos se envían desde su sección al inicio y no necesitan este guardado. Este formulario guarda únicamente los datos del anuncio; cambiar información relevante vuelve a revisión." : adminAssisted ? "Al crear el anuncio pasarás directamente a la carga de la foto principal, hasta 10 fotos y hasta 3 videos. El material que subas como administrador se aprobará al instante; el anuncio se publica desde moderación." : <>Guarda y envía el anuncio a revisión. Luego encontrarás al inicio la carga de fotos y videos; puedes adjuntarlos sin esperar la aprobación del anuncio. Cada imagen puede pesar hasta 10 MB y los archivos se revisan por separado.{type === "escort" && " También podrás adjuntar tu carnet o examen médico privado (JPG, PNG, WebP o PDF de hasta 15 MB)."}</>}</p>
      </section>

      <div className="profile-form-actions">
        {!adminEdit && <button className="button button-outline" name="intent" type="submit" value="draft" formNoValidate>Guardar borrador</button>}
        <button className="button button-primary" name="intent" type="submit" value="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
