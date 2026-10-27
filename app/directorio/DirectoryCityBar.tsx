"use client";
import { ActionButton } from "@/app/ActionButton";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/app/NavigationLink";
import { cityDirectory, regions } from "@/app/locations";
import { clearPreferredCity, savePreferredCity } from "./location-client";
import { beginUserNavigation } from "@/lib/user-navigation-progress";

type DirectoryKind = "escort" | "agency" | "rental" | "content";
const normalizeCity = (value: string) => value.trim().toLocaleLowerCase("es-CL").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const cityGroups = regions.map(region => ({ ...region, matches: cityDirectory.filter(city => city.regionSlug === region.id).map(city => ({ ...city, searchName: normalizeCity(city.city) })) }));

export function DirectoryCityBar({ selectedCity, kind, preview = false }: { selectedCity?: string; kind: DirectoryKind; preview?: boolean }) {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const basePath = kind === "content" ? "/venta-contenido" : kind === "agency" ? "/agencias" : kind === "rental" ? "/arriendos" : "/escorts";
  const matchingRegions = useMemo(() => {
    const needle = normalizeCity(search);
    return needle ? cityGroups.map(region => ({ ...region, matches: region.matches.filter(city => city.searchName.includes(needle)) })).filter(region => region.matches.length) : cityGroups;
  }, [search]);

  useEffect(() => {
    if (!menuOpen) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const summary = menuRef.current?.querySelector("summary");
      if (!summary || !popoverRef.current) return;
      const viewportBottom = window.visualViewport ? window.visualViewport.height + window.visualViewport.offsetTop : window.innerHeight;
      popoverRef.current.style.maxHeight = `${Math.max(140, Math.min(580, viewportBottom - summary.getBoundingClientRect().bottom - 22))}px`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [menuOpen]);

  function chooseCity(citySlug?: string) {
    if (preview) return;
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
      <div className="directory-city-breadcrumb"><Link href="/" className="directory-home-link">Volver a la página principal</Link><span className="directory-city-crumb">Directorio <span aria-hidden="true">/</span></span></div>
      <details ref={menuRef} onToggle={event => setMenuOpen(event.currentTarget.open)} onKeyDown={(event) => { if (event.key === "Escape") menuRef.current?.removeAttribute("open"); }}>
        <summary aria-label={`Cambiar ciudad, actual: ${selectedCity ?? "todo Chile"}`} aria-disabled={preview || undefined} tabIndex={preview ? -1 : undefined} onClick={preview ? event => event.preventDefault() : undefined}><span aria-hidden="true">⌖</span>{selectedCity ?? "Todo Chile"}<span aria-hidden="true">⌄</span></summary>
        {menuOpen && <div className="directory-city-popover" ref={popoverRef}>
          <div className="directory-city-popover-heading"><strong>Elegir ciudad o comuna</strong><ActionButton type="button" className="directory-city-close" aria-label="Cerrar selector de ciudades" onClick={() => { menuRef.current?.removeAttribute("open"); menuRef.current?.querySelector("summary")?.focus(); }}>×</ActionButton></div>
          <label className="sr-only" htmlFor="directory-city-search">Buscar ciudad o comuna</label>
          <input id="directory-city-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar ciudad o comuna…" autoComplete="off" />
          <div className="directory-city-options">
            {!search && <ActionButton type="button" className={!selectedCity ? "is-selected" : ""} onClick={() => chooseCity()}>Todo Chile</ActionButton>}
            {matchingRegions.map((region) => <section key={region.id} aria-label={region.shortTitle}>
              <p>{region.shortTitle}</p>
              <div>{region.matches.map((city) => <ActionButton type="button" key={city.citySlug} className={city.city === selectedCity ? "is-selected" : ""} onClick={() => chooseCity(city.citySlug)}>{city.city}</ActionButton>)}</div>
            </section>)}
            {!matchingRegions.length && <p className="directory-city-empty">No hay ciudades de cobertura con ese nombre.</p>}
          </div>
        </div>}
      </details>
    </div>
  </nav>;
}
