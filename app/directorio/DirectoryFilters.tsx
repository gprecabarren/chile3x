"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { regions } from "@/app/locations";
import {
  additionalServices,
  bodyTypes,
  bustSizes,
  hairColors,
  includedServices,
  nationalities,
  profileTags,
  skinColors,
  spokenLanguages,
  tagLabels,
  tierLabels,
} from "@/lib/profile";
import type { DirectoryFilters } from "@/lib/directory";

type DirectoryFiltersProps = {
  action: string;
  filters: DirectoryFilters;
  pinnedCity?: string;
  pinnedRegion?: string;
  showType?: boolean;
  showEscortFilters?: boolean;
  showServices?: boolean;
};

export function DirectoryFilters({ action, filters, pinnedCity, pinnedRegion, showType = false, showEscortFilters = true, showServices = true }: DirectoryFiltersProps) {
  const router = useRouter();
  const [region, setRegion] = useState(filters.region ?? pinnedRegion ?? "");
  const [city, setCity] = useState(filters.city ?? pinnedCity ?? "");
  const [selectedTags, setSelectedTags] = useState(filters.tags);
  const [category, setCategory] = useState(filters.category ?? filters.tier ?? (showType && filters.type !== "escort" ? filters.type : ""));
  const [ageMin, setAgeMin] = useState(Math.max(18, Math.min(70, filters.ageMin ?? 18)));
  const [ageMax, setAgeMax] = useState(Math.max(18, Math.min(70, filters.ageMax ?? 70)));
  const escortAgeEnabled = showEscortFilters && category !== "agency" && category !== "rental";
  const availableCities = useMemo(() => regions.find((item) => item.title === region)?.cities ?? [], [region]);
  const hasAdvancedFilters = Boolean(
    filters.nationality || filters.gender || filters.skinColor || filters.hairColor ||
    filters.bodyType || filters.bustSize || filters.language || filters.tags.length || filters.servicesIncluded.length || filters.servicesAdditional.length,
  );
  const hasVisibleFilters = Boolean(
    (!pinnedCity && (filters.region || filters.city)) || hasAdvancedFilters || filters.name || filters.category || filters.tier || filters.ageMin || filters.ageMax || filters.online || filters.verified,
  );
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean | null>(null);
  const showMobileFilters = mobileFilterOpen ?? hasVisibleFilters;

  function changeRegion(nextRegion: string) {
    setRegion(nextRegion);
    setCity("");
  }

  function changeTag(tag: string) {
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (tag === "milf") return [...current.filter((item) => item !== "trans"), tag];
      if (tag === "trans") return [...current.filter((item) => item !== "milf"), tag];
      return [...current, tag];
    });
  }

  function search(form: HTMLFormElement, value = category) {
    const params = new URLSearchParams();
    for (const [key, field] of new FormData(form)) if (typeof field === "string" && field.trim() && (key !== "nombre" || field.trim().length >= 2)) params.append(key, field.trim());
    if (value === "agency" || value === "rental") {
      for (const key of ["tier", "tag", "nacionalidad", "genero", "piel", "pelo", "cuerpo", "busto", "idioma", "incluido", "adicional", "edad_min", "edad_max"]) params.delete(key);
    }
    const destination = action === "/escorts" && value === "agency" ? "/agencias" : action === "/escorts" && value === "rental" ? "/arriendos" : action;
    if (destination !== action) params.delete("categoria");
    const anchor = pinnedCity && value ? `#${value}` : "";
    router.push(`${destination}${params.size ? `?${params}` : ""}${anchor}`);
  }

  return (
    <form className="directory-filter-form" action={action} method="get" onSubmit={(event) => { event.preventDefault(); search(event.currentTarget); }}>
      <section className="directory-filters" aria-label="Buscar publicaciones">
      <div className="filter-heading"><div><p className="eyebrow">{showEscortFilters ? "BUSCADOR DE ESCORTS" : "BUSCADOR DE ANUNCIOS"}</p><h2>Encuentra con más precisión</h2><p>{!showEscortFilters ? "Elige una ciudad y busca por nombre, conexión o verificación." : pinnedCity ? "Busca por nombre, categoría o edad y combina los filtros de apariencia y servicios." : "Elige una región o ciudad y combina nombre, categoría, edad y características."}</p></div></div>
      <button className="filter-mobile-toggle" type="button" aria-expanded={showMobileFilters} aria-controls="directory-filter-controls" onClick={() => setMobileFilterOpen(!showMobileFilters)}>
        <span>{showMobileFilters ? "Ocultar filtros" : "Mostrar filtros"}</span>
        <small>{hasVisibleFilters ? "Hay filtros aplicados" : "Nombre, categoría y más"}</small>
      </button>
      <div id="directory-filter-controls" className={`filter-mobile-body${showMobileFilters ? " is-open" : ""}`}>
      <div className="filter-grid">
        {!pinnedCity && <label>Región<select name="region" value={region} onChange={(event) => changeRegion(event.target.value)}><option value="">Todas las regiones</option>{regions.map((item) => <option key={item.id} value={item.title}>Región {item.numeral} · {item.shortTitle}</option>)}</select></label>}
        {!pinnedCity && <label>Ciudad<select name="ciudad" value={city} onChange={(event) => setCity(event.target.value)} disabled={Boolean(region) && !availableCities.length}><option value="">Todas las ciudades</option>{(region ? availableCities : regions.flatMap((item) => item.cities)).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
      </div>
      <section className="directory-quick-filters" aria-label="Filtros rápidos">
        <label className="quick-filter-search"><span className="sr-only">Buscar por nombre</span><input name="nombre" type="search" minLength={2} maxLength={80} defaultValue={filters.name ?? ""} placeholder="Ej.: Valentina, Camila, Alejandra" /></label>
        {showEscortFilters && <label className={`quick-filter-category${category ? ` is-${category}` : ""}`}><span className="sr-only">Categoría</span><select name="categoria" value={category} onChange={(event) => {
          const value = event.target.value;
          setCategory(value);
          const form = event.target.form;
          if (form) search(form, value);
        }}><option value="">Todas las categorías</option>{(["vip", "premium", "bronze"] as const).map((tier) => <option key={tier} value={tier}>{tier === "vip" ? "✦" : tier === "premium" ? "◆" : "⬡"} {tierLabels[tier]}</option>)}<option value="masajes">✿ Masajes</option><option value="agency">◇ Agencias</option><option value="rental">▣ Arriendos</option></select></label>}
        {showEscortFilters && <details className="quick-filter-age" open={Boolean(filters.ageMin || filters.ageMax)}><summary>Edad {ageMin > 18 || ageMax < 70 ? `${ageMin}–${ageMax === 70 ? "70+" : ageMax}` : ""}</summary><div className="quick-filter-age-popover"><div><strong>Rango de edad</strong><span>{ageMin} – {ageMax === 70 ? "70+" : ageMax} años</span></div><label>Desde {ageMin}<input type="range" min="18" max="70" value={ageMin} name={escortAgeEnabled && ageMin > 18 ? "edad_min" : undefined} onChange={(event) => setAgeMin(Math.min(Number(event.target.value), ageMax))} disabled={!escortAgeEnabled} /></label><label>Hasta {ageMax === 70 ? "70+" : ageMax}<input type="range" min="18" max="70" value={ageMax} name={escortAgeEnabled && ageMax < 70 ? "edad_max" : undefined} onChange={(event) => setAgeMax(Math.max(Number(event.target.value), ageMin))} disabled={!escortAgeEnabled} /></label><button type="button" onClick={() => { setAgeMin(18); setAgeMax(70); }}>Restablecer edad</button></div></details>}
        <label className="quick-filter-toggle is-online"><input name="online" value="1" type="checkbox" defaultChecked={filters.online} /><span>Online</span></label>
        <label className="quick-filter-toggle is-verified"><input name="verificados" value="1" type="checkbox" defaultChecked={filters.verified} /><span>Verificados</span></label>
        <a className="quick-filter-clear" href={action}>Limpiar</a>
        <button className="quick-filter-apply" type="submit">Buscar</button>
      </section>
      {(showEscortFilters || showServices) && <details className="filter-more-options" open={hasAdvancedFilters}>
        <summary><span>Ver más filtros</span><small>Apariencia, categorías adicionales y servicios</small></summary>
        {showEscortFilters && <><div className="filter-grid filter-grid-advanced"><label>Nacionalidad<select name="nacionalidad" defaultValue={filters.nationality ?? ""}><option value="">Cualquiera</option>{nationalities.map((item) => <option key={item}>{item}</option>)}</select></label><label>Género<select name="genero" defaultValue={filters.gender ?? ""}><option value="">Cualquiera</option><option>Femenino</option><option>Masculino</option><option>No binario</option><option>Trans</option></select></label><label>Color de piel<select name="piel" defaultValue={filters.skinColor ?? ""}><option value="">Cualquiera</option>{skinColors.map((item) => <option key={item}>{item}</option>)}</select></label><label>Color de pelo<select name="pelo" defaultValue={filters.hairColor ?? ""}><option value="">Cualquiera</option>{hairColors.map((item) => <option key={item}>{item}</option>)}</select></label><label>Tipo de cuerpo<select name="cuerpo" defaultValue={filters.bodyType ?? ""}><option value="">Cualquiera</option>{bodyTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Tamaño de busto<select name="busto" defaultValue={filters.bustSize ?? ""}><option value="">Cualquiera</option>{bustSizes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="filter-full">Idioma<select name="idioma" defaultValue={filters.language ?? ""}><option value="">Cualquiera</option>{spokenLanguages.map((language) => <option key={language} value={language}>{language}</option>)}</select></label></div><fieldset className="filter-fieldset"><legend>Categorías adicionales</legend><div className="filter-check-grid">{profileTags.map((tag) => {
          const blocked = (tag === "milf" && selectedTags.includes("trans")) || (tag === "trans" && selectedTags.includes("milf"));
          return <label key={tag} className={blocked ? "is-blocked" : ""}><input name="tag" type="checkbox" value={tag} checked={selectedTags.includes(tag)} disabled={blocked} onChange={() => changeTag(tag)} />{tagLabels[tag]}</label>;
        })}</div><small>MILF y TRANS no se pueden combinar en la misma búsqueda.</small></fieldset></>}
        {showServices && <details className="filter-services" open={filters.servicesIncluded.length > 0 || filters.servicesAdditional.length > 0}>
          <summary><span>Filtrar por servicios</span><small>Incluidos, adicionales y fetiches</small></summary>
          <div className="filter-service-columns">
            <fieldset className="filter-fieldset"><legend>Servicios incluidos</legend><div className="filter-check-grid">{includedServices.map((service) => <label key={service}><input name="incluido" type="checkbox" value={service} defaultChecked={filters.servicesIncluded.includes(service)} />{service}</label>)}</div></fieldset>
            <fieldset className="filter-fieldset"><legend>Servicios adicionales</legend><div className="filter-check-grid">{additionalServices.map((service) => <label key={service}><input name="adicional" type="checkbox" value={service} defaultChecked={filters.servicesAdditional.includes(service)} />{service}</label>)}</div></fieldset>
          </div>
        </details>}
      </details>}
      </div>
      </section>

    </form>
  );
}
