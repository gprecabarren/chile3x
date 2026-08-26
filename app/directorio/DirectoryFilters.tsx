"use client";

import { useMemo, useState } from "react";
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
  tiers,
  tierLabels,
  type ProfileType,
} from "@/lib/profile";
import type { DirectoryFilters } from "@/lib/directory";

type DirectoryFiltersProps = {
  action: string;
  filters: DirectoryFilters;
  pinnedCity?: string;
  pinnedRegion?: string;
  showType?: boolean;
  types?: ProfileType[];
  showEscortFilters?: boolean;
  showServices?: boolean;
};

export function DirectoryFilters({ action, filters, pinnedCity, pinnedRegion, showType = false, types = ["escort", "agency", "rental"], showEscortFilters = true, showServices = true }: DirectoryFiltersProps) {
  const [region, setRegion] = useState(filters.region ?? pinnedRegion ?? "");
  const [city, setCity] = useState(filters.city ?? pinnedCity ?? "");
  const [selectedTags, setSelectedTags] = useState(filters.tags);
  const availableCities = useMemo(() => regions.find((item) => item.title === region)?.cities ?? [], [region]);
  const hasAdvancedFilters = Boolean(
    filters.nationality || filters.gender || filters.ageMin || filters.ageMax || filters.skinColor || filters.hairColor ||
    filters.bodyType || filters.bustSize || filters.language || filters.tags.length || filters.servicesIncluded.length || filters.servicesAdditional.length,
  );

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

  return (
    <form className="directory-filters" action={action} method="get">
      <div className="filter-heading"><div><p className="eyebrow">BUSCADOR DE ESCORTS</p><h2>Encuentra con más precisión</h2><p>Elige una ciudad, categoría o nombre. Las características y servicios quedan disponibles en filtros avanzados.</p></div></div>
      <div className="filter-grid">
        <label className="filter-full">Buscar por nombre<input name="nombre" type="search" minLength={2} maxLength={80} defaultValue={filters.name ?? ""} placeholder="Escribe el nombre del perfil" /></label>
        {!pinnedCity && <label>Región<select name="region" value={region} onChange={(event) => changeRegion(event.target.value)}><option value="">Todas las regiones</option>{regions.map((item) => <option key={item.id} value={item.title}>Región {item.numeral} · {item.shortTitle}</option>)}</select></label>}
        {!pinnedCity && <label>Ciudad<select name="ciudad" value={city} onChange={(event) => setCity(event.target.value)} disabled={Boolean(region) && !availableCities.length}><option value="">Todas las ciudades</option>{(region ? availableCities : regions.flatMap((item) => item.cities)).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
        {showType && <label>Tipo de publicación<select name="tipo" defaultValue={filters.type ?? ""}><option value="">Todos los tipos</option>{types.map((type) => <option key={type} value={type}>{type === "escort" ? "Escorts" : type === "agency" ? "Agencias" : "Arriendos"}</option>)}</select></label>}
        {showEscortFilters && <label>Categoría<select name="tier" defaultValue={filters.tier ?? ""}><option value="">Todas las categorías</option>{tiers.map((tier) => <option key={tier} value={tier}>{tierLabels[tier]}</option>)}</select></label>}
      </div>
      {(showEscortFilters || showServices) && <details className="filter-more-options" open={hasAdvancedFilters}>
        <summary><span>Ver más filtros</span><small>Edad, apariencia, categorías, servicios y fetiches</small></summary>
        {showEscortFilters && <><div className="filter-grid filter-grid-advanced"><label>Nacionalidad<select name="nacionalidad" defaultValue={filters.nationality ?? ""}><option value="">Cualquiera</option>{nationalities.map((item) => <option key={item}>{item}</option>)}</select></label><label>Género<select name="genero" defaultValue={filters.gender ?? ""}><option value="">Cualquiera</option><option>Femenino</option><option>Masculino</option><option>No binario</option><option>Trans</option></select></label><label>Edad mínima<input name="edad_min" type="number" inputMode="numeric" min="18" defaultValue={filters.ageMin ?? ""} /></label><label>Edad máxima<input name="edad_max" type="number" inputMode="numeric" min="18" defaultValue={filters.ageMax ?? ""} /></label><label>Color de piel<select name="piel" defaultValue={filters.skinColor ?? ""}><option value="">Cualquiera</option>{skinColors.map((item) => <option key={item}>{item}</option>)}</select></label><label>Color de pelo<select name="pelo" defaultValue={filters.hairColor ?? ""}><option value="">Cualquiera</option>{hairColors.map((item) => <option key={item}>{item}</option>)}</select></label><label>Tipo de cuerpo<select name="cuerpo" defaultValue={filters.bodyType ?? ""}><option value="">Cualquiera</option>{bodyTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Tamaño de busto<select name="busto" defaultValue={filters.bustSize ?? ""}><option value="">Cualquiera</option>{bustSizes.map((item) => <option key={item}>{item}</option>)}</select></label><label className="filter-full">Idioma<select name="idioma" defaultValue={filters.language ?? ""}><option value="">Cualquiera</option>{spokenLanguages.map((language) => <option key={language} value={language}>{language}</option>)}</select></label></div><fieldset className="filter-fieldset"><legend>Categorías adicionales</legend><div className="filter-check-grid">{profileTags.map((tag) => {
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
      <div className="filter-actions"><a href={action}>Limpiar filtros</a><button className="button button-primary" type="submit">Buscar perfiles</button></div>
    </form>
  );
}
