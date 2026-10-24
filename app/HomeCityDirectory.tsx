"use client";

import { useState } from "react";
import Link from "@/app/NavigationLink";
import { cityDirectory } from "./locations";
import { savePreferredCity } from "./directorio/location-client";
import { ActionIcon } from "./ActionIcon";
import type {HomeTexts} from "@/lib/home-content-policy";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

export function HomeCityDirectory({texts}:{texts?:Pick<HomeTexts,"cityTitle"|"cityAll"|"citySearchLabel"|"citySearchPlaceholder">}={}) {
  const [search, setSearch] = useState("");
  const query = normalize(search);
  // Preserve the existing region/city order without printing regional headings.
  const cities = cityDirectory.filter(city => !query || normalize(city.city).includes(query));

  return <section className="home-city-directory" id="cobertura" aria-labelledby="home-city-directory-title">
    <header><div><p className="eyebrow">UBICACIÓN</p><h2 id="home-city-directory-title">{texts?.cityTitle??"Elige una ciudad"}</h2></div><Link href="/escorts" className="home-city-all">{texts?.cityAll??"Ver todo Chile"} <span aria-hidden="true">→</span></Link></header>
    <div className="home-city-directory-filters">
      <label htmlFor="home-city-search">{texts?.citySearchLabel??"Buscar ciudad"}<input id="home-city-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={texts?.citySearchPlaceholder??"Escribe una ciudad"} autoComplete="off" maxLength={80} aria-controls="home-city-directory-links" /></label>
    </div>
    <nav aria-label="Ciudades disponibles" id="home-city-directory-links" className="home-city-directory-links">
      {cities.map(city => <Link key={city.citySlug} href={`/escorts/${city.citySlug}`} onClick={() => savePreferredCity(city.citySlug)} aria-label={`Ver escorts en ${city.city}`}>
        {city.city}<span aria-hidden="true">→</span>
      </Link>)}
    </nav>
    {cities.length === 0 && <p className="home-city-directory-empty" role="status">No hay coincidencias. Prueba otro nombre.</p>}
    <p className="home-city-directory-count" role="status" aria-live="polite">{cities.length} de {cityDirectory.length} ciudades y comunas</p>
    <p className="home-city-directory-note"><ActionIcon name="lock" />Solo para mayores de 18 años.</p>
  </section>;
}
