"use client";

import { useState } from "react";
import { regions } from "@/app/locations";
import { ActionAnchor, ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";
import { escortGenders } from "@/lib/profile";
import { SAMPLE_PROVENANCES, SAMPLE_PROVENANCE_LABELS, SAMPLE_STATUSES, SAMPLE_STATUS_LABELS } from "@/lib/private-sample-policy";

type AppliedFilter = { label: string; removeHref: string };
type Filters = {
  q: string;
  phone: string;
  region: string;
  city: string;
  provenance: string;
  status: string;
  contact: "all" | "pending" | "contacted";
  gender: string;
  view: "active" | "trash";
};

export function SampleFilters({ initial, applied, clearHref }: { initial: Filters; applied: AppliedFilter[]; clearHref: string }) {
  const [region, setRegion] = useState(initial.region);
  const [city, setCity] = useState(initial.city);
  const selectedRegion = regions.find(item => item.title === region);
  const cities = selectedRegion ? selectedRegion.cities : regions.flatMap(item => item.cities);
  const advancedCount = [initial.provenance, initial.view === "trash" ? "" : initial.status, initial.contact === "all" ? "" : initial.contact, initial.gender].filter(Boolean).length;

  return <form className="sample-filters" method="get" role="search" aria-label="Buscar muestras privadas">
    {initial.view === "trash" && <input type="hidden" name="view" value="trash" />}
    <header className="sample-filters-heading"><div><h2>Buscar muestras</h2><p>Combina nombre, teléfono y ubicación para encontrar a la persona que buscas.</p></div>{applied.length > 0 && <span>{applied.length} filtro{applied.length === 1 ? " aplicado" : "s aplicados"}</span>}</header>
    <div className="sample-filter-grid">
      <label>Nombre o usuario<input name="q" type="search" maxLength={100} defaultValue={initial.q} placeholder="Nombre, @usuario o teléfono" /></label>
      <label>Teléfono o WhatsApp<input name="phone" type="search" inputMode="tel" maxLength={40} defaultValue={initial.phone} placeholder="Número completo o parte de él" autoComplete="off" /></label>
      <label>Región<select aria-label="Región" name="region" value={region} onChange={event => { setRegion(event.target.value); setCity(""); }}><option value="">Todas las regiones</option>{regions.map(item => <option key={item.id} value={item.title}>{item.displayTitle}</option>)}</select></label>
      <label>Ciudad<select aria-label="Ciudad" name="city" value={city} disabled={Boolean(selectedRegion && !cities.length)} onChange={event => { const next = event.target.value; setCity(next); if (!region && next) setRegion(regions.find(item => item.cities.some(value => value === next))?.title ?? ""); }}><option value="">{selectedRegion && !cities.length ? "Sin ciudades disponibles" : "Todas las ciudades"}</option>{cities.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
    <details className="sample-advanced-filters" open={advancedCount > 0}>
      <summary><span><ActionIcon name="filter" />Más filtros</span><small>{advancedCount ? `${advancedCount} activo${advancedCount === 1 ? "" : "s"}` : "Contacto, procedencia y perfil"}</small></summary>
      <div className="sample-filter-grid">
        <label>Seguimiento de contacto<select aria-label="Seguimiento de contacto" name="contact" defaultValue={initial.contact}><option value="all">Todos los contactos</option><option value="pending">Pendientes de contactar</option><option value="contacted">Ya contactados</option></select></label>
        <label>Procedencia<select aria-label="Procedencia" name="provenance" defaultValue={initial.provenance}><option value="">Todas las procedencias</option>{SAMPLE_PROVENANCES.map(value => <option key={value} value={value}>{SAMPLE_PROVENANCE_LABELS[value]}</option>)}</select></label>
        <label>Estado<select aria-label="Estado" name="sample_status" defaultValue={initial.status} disabled={initial.view === "trash"}>{initial.view === "trash" ? <option value="trashed">En papelera</option> : <><option value="">Todos los estados</option>{SAMPLE_STATUSES.filter(value => value !== "trashed").map(value => <option key={value} value={value}>{SAMPLE_STATUS_LABELS[value]}</option>)}</>}</select></label>
        <label>Género<select aria-label="Género" name="gender" defaultValue={initial.gender}><option value="">Todos los géneros</option>{escortGenders.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>
    </details>
    {applied.length > 0 && <div className="sample-applied-filters" aria-label="Filtros aplicados">{applied.map(filter => <a key={filter.removeHref} href={filter.removeHref} aria-label={`Quitar filtro: ${filter.label}`}><span>{filter.label}</span><ActionIcon name="close" /></a>)}</div>}
    <div className="sample-filter-actions"><ActionButton className="button button-primary" type="submit">Aplicar filtros</ActionButton>{applied.length > 0 && <ActionAnchor className="button button-outline" href={clearHref}>Limpiar filtros</ActionAnchor>}</div>
  </form>;
}
