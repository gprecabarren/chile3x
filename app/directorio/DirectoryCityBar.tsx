"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/app/NavigationLink";
import { cityDirectory, regions } from "@/app/locations";
import { clearPreferredCity, savePreferredCity } from "./location-client";
import { beginUserNavigation } from "@/lib/user-navigation-progress";

type DirectoryKind = "escort" | "agency" | "rental" | "content";
const normalizeCity = (value: string) => value.trim().toLocaleLowerCase("es-CL").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const cityGroups = regions.map(region => ({ ...region, matches: cityDirectory.filter(city => city.regionSlug === region.id).map(city => ({ ...city, searchName: normalizeCity(city.city) })) }));

export function DirectoryCityBar({ selectedCity, kind }: { selectedCity?: string; kind: DirectoryKind }) {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  const basePath = kind === "content" ? "/venta-contenido" : kind === "agency" ? "/agencias" : kind === "rental" ? "/arriendos" : "/escorts";
  const matchingRegions = useMemo(() => {
    const needle = normalizeCity(search);
    return needle ? cityGroups.map(region => ({ ...region, matches: region.matches.filter(city => city.searchName.includes(needle)) })).filter(region => region.matches.length) : cityGroups;
  }, [search]);

  function chooseCity(citySlug?: string) {
    const city = cityDirectory.find((item) => item.citySlug === citySlug);
    const params = new URLSearchParams(window.location.search);
    for (const key of ["region", "ciudad", "cerca"]) params.delete(key);
    if (!city && kind === "escort" && ["agency", "rental"].includes(params.get("categoria") ?? "")) params.delete("categoria");
    if (city) {
      savePreferredCity(city.citySlug);
      if (kind !== "escort") {
        params.set("region", city.region);
        params.set("ciudad", city.city);
      }
    } else clearPreferredCity();
    menuRef.current?.removeAttribute("open");
    const pathname = city && kind === "escort" ? `/escorts/${city.citySlug}` : basePath;
    const href = `${pathname}${params.size ? `?${params}` : ""}`;
    beginUserNavigation(href);
    router.push(href);
  }

  return <nav className="directory-city-bar" aria-label="Cambiar ciudad del directorio">
    <div className="directory-city-bar-inner">
      <div className="directory-city-breadcrumb"><Link href="/" className="directory-home-link">Inicio</Link><span className="directory-city-crumb">Directorio <span aria-hidden="true">/</span></span></div>
      <details ref={menuRef} onToggle={event => setMenuOpen(event.currentTarget.open)} onKeyDown={(event) => { if (event.key === "Escape") menuRef.current?.removeAttribute("open"); }}>
        <summary aria-label={`Cambiar ciudad, actual: ${selectedCity ?? "todo Chile"}`}><span aria-hidden="true">⌖</span>{selectedCity ?? "Todo Chile"}<span aria-hidden="true">⌄</span></summary>
        {menuOpen && <div className="directory-city-popover">
          <strong>Elegir ciudad o comuna</strong>
          <label className="sr-only" htmlFor="directory-city-search">Buscar ciudad o comuna</label>
          <input id="directory-city-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar ciudad o comuna…" autoComplete="off" />
          <div className="directory-city-options">
            {!search && <button type="button" className={!selectedCity ? "is-selected" : ""} onClick={() => chooseCity()}>Todo Chile</button>}
            {matchingRegions.map((region) => <section key={region.id} aria-label={region.shortTitle}>
              <p>{region.shortTitle}</p>
              <div>{region.matches.map((city) => <button type="button" key={city.citySlug} className={city.city === selectedCity ? "is-selected" : ""} onClick={() => chooseCity(city.citySlug)}>{city.city}</button>)}</div>
            </section>)}
            {!matchingRegions.length && <p className="directory-city-empty">No hay ciudades de cobertura con ese nombre.</p>}
          </div>
        </div>}
      </details>
    </div>
  </nav>;
}
