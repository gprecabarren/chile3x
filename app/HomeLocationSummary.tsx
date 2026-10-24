"use client";
import { ActionButton } from "@/app/ActionButton";

import Link from "@/app/NavigationLink";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { clearPreferredCity, savePreferredCity } from "@/app/directorio/location-client";
import { cityDirectory, regions } from "@/app/locations";

type NearbyCity = {
  city: string;
  citySlug: string;
};

export function HomeLocationSummary({
  initialCityName,
  nearbyCities,
  children,
}: {
  initialCityName?: string;
  nearbyCities: readonly NearbyCity[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [cleared, setCleared] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const cityName = !cleared && initialCityName ? initialCityName : "Todo Chile";

  function resetLocation() {
    clearPreferredCity();
    setCleared(true);
    router.refresh();
  }

  return (
    <aside className="home-location-summary" aria-label="Explorar por ciudad y región">
      <div className="home-location-heading">
        <span className="home-location-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" focusable="false"><circle cx="12" cy="12" r="7" /><path d="M12 2v20M2 12h20" /></svg></span>
        <div className="home-location-current"><small>{initialCityName && !cleared ? "CIUDAD ELEGIDA" : "COBERTURA NACIONAL"}</small><strong>{cityName}</strong></div>
        <div className="home-location-actions">
          <ActionButton className="home-city-trigger" type="button" aria-expanded={selectorOpen} aria-controls={selectorOpen ? "home-city-selector" : undefined} onClick={() => setSelectorOpen((open) => !open)}>Ir a una ciudad <span aria-hidden="true">{selectorOpen ? "−" : "+"}</span></ActionButton>
          {initialCityName && !cleared && <ActionButton className="home-location-reset" type="button" onClick={resetLocation}>Ver todo Chile</ActionButton>}
        </div>
      </div>
      {children}
      {nearbyCities.length > 0 && !cleared && <nav aria-label="Otras ciudades de la región">En la región: {nearbyCities.map((city) => <Link key={city.citySlug} href={`/escorts/${city.citySlug}`}>{city.city}</Link>)}</nav>}
      {selectorOpen && <div id="home-city-selector" className="home-city-selector"><p>Elige una ciudad disponible</p><div className="home-city-regions">{regions.filter((region) => region.cities.length > 0).map((region) => <section key={region.id} aria-label={region.displayTitle}><h3>{region.displayTitle}</h3><div>{cityDirectory.filter((city) => city.regionSlug === region.id).map((city) => <Link key={city.citySlug} href={`/escorts/${city.citySlug}`} onClick={() => savePreferredCity(city.citySlug)}>{city.city}</Link>)}</div></section>)}</div></div>}
    </aside>
  );
}
