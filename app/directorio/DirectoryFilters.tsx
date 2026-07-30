"use client";

import { useMemo, useState } from "react";
import { regions } from "@/app/locations";
import {
  additionalServices,
  bodyTypes,
  bustSizes,
  hairColors,
  includedServices,
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

  function changeRegion(nextRegion: string) {
    setRegion(nextRegion);
    setCity("");
  }

  function changeTag(tag: string) {
    setSelectedTags((current) => {
      if (current.includes(tag)) return current.filter((item) => item !== tag);
      if (tag === "milf") return [...current.filter((item) => item !== "hombres"), tag];
      if (tag === "hombres") return [...current.filter((item) => item !== "milf"), tag];
      return [...current, tag];
    });
  }

  return (
    <form className="directory-filters" action={action} method="get">
      <div className="filter-heading"><div><p className="eyebrow">FILTRO AVANZADO</p><h2>Encuentra con más precisión</h2></div><button className="button button-outline" type="submit">Aplicar filtros</button></div>
      <div className="filter-grid">
        {!pinnedCity && <label>Región<select name="region" value={region} onChange={(event) => changeRegion(event.target.value)}><option value="">Todas las regiones</option>{regions.map((item) => <option key={item.id} value={item.title}>{item.shortTitle}</option>)}</select></label>}
        {!pinnedCity && <label>Ciudad<select name="ciudad" value={city} onChange={(event) => setCity(event.target.value)} disabled={Boolean(region) && !availableCities.length}><option value="">Todas las ciudades</option>{(region ? availableCities : regions.flatMap((item) => item.cities)).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
        {showType && <label>Tipo de publicación<select name="tipo" defaultValue={filters.type ?? ""}><option value="">Todos los tipos</option>{types.map((type) => <option key={type} value={type}>{type === "escort" ? "Escorts" : type === "agency" ? "Agencias" : "Arriendos"}</option>)}</select></label>}
        <label>Categoría<select name="tier" defaultValue={filters.tier ?? ""}><option value="">Todas las categorías</option>{tiers.map((tier) => <option key={tier} value={tier}>{tierLabels[tier]}</option>)}</select></label>
        {showEscortFilters && <><label>Nacionalidad<input name="nacionalidad" defaultValue={filters.nationality} placeholder="Ej. Chilena" /></label><label>Género<select name="genero" defaultValue={filters.gender ?? ""}><option value="">Cualquiera</option><option>Femenino</option><option>Masculino</option><option>No binario</option><option>Trans</option></select></label><label>Edad mínima<input name="edad_min" inputMode="numeric" min="18" defaultValue={filters.ageMin ?? ""} /></label><label>Edad máxima<input name="edad_max" inputMode="numeric" min="18" defaultValue={filters.ageMax ?? ""} /></label><label>Color de piel<select name="piel" defaultValue={filters.skinColor ?? ""}><option value="">Cualquiera</option>{skinColors.map((item) => <option key={item}>{item}</option>)}</select></label><label>Color de pelo<select name="pelo" defaultValue={filters.hairColor ?? ""}><option value="">Cualquiera</option>{hairColors.map((item) => <option key={item}>{item}</option>)}</select></label><label>Tipo de cuerpo<select name="cuerpo" defaultValue={filters.bodyType ?? ""}><option value="">Cualquiera</option>{bodyTypes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Tamaño de busto<select name="busto" defaultValue={filters.bustSize ?? ""}><option value="">Cualquiera</option>{bustSizes.map((item) => <option key={item}>{item}</option>)}</select></label><label className="filter-full">Idioma<select name="idioma" defaultValue={filters.language ?? ""}><option value="">Cualquiera</option>{spokenLanguages.map((language) => <option key={language} value={language}>{language}</option>)}</select></label></>}
      </div>
      {showEscortFilters && <><fieldset className="filter-fieldset"><legend>Etiquetas</legend><div className="filter-check-grid">{profileTags.map((tag) => {
        const blocked = (tag === "milf" && selectedTags.includes("hombres")) || (tag === "hombres" && selectedTags.includes("milf"));
        return <label key={tag} className={blocked ? "is-blocked" : ""}><input name="tag" type="checkbox" value={tag} checked={selectedTags.includes(tag)} disabled={blocked} onChange={() => changeTag(tag)} />{tagLabels[tag]}</label>;
      })}</div><small>MILF y Hombres no se pueden combinar en la misma búsqueda.</small></fieldset>
      </>}
      {showServices && <>
      <div className="filter-service-columns">
        <fieldset className="filter-fieldset"><legend>Servicios incluidos</legend><div className="filter-check-grid">{includedServices.map((service) => <label key={service}><input name="incluido" type="checkbox" value={service} defaultChecked={filters.servicesIncluded.includes(service)} />{service}</label>)}</div></fieldset>
        <fieldset className="filter-fieldset"><legend>Servicios adicionales</legend><div className="filter-check-grid">{additionalServices.map((service) => <label key={service}><input name="adicional" type="checkbox" value={service} defaultChecked={filters.servicesAdditional.includes(service)} />{service}</label>)}</div></fieldset>
      </div></>}
      <div className="filter-actions"><a href={action}>Limpiar filtros</a><button className="button button-primary" type="submit">Ver resultados</button></div>
    </form>
  );
}
