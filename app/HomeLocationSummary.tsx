"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearPreferredCity, savePreferredCity } from "@/app/directorio/location-client";
import { cityDirectory, regions } from "@/app/locations";

type NearbyCity = {
  city: string;
  citySlug: string;
};

export function HomeLocationSummary({
  initialCityName,
  nearbyCities,
}: {
  initialCityName?: string;
  nearbyCities: readonly NearbyCity[];
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
    <aside className="home-location-summary" aria-label="Ubicación priorizada">
      <span aria-hidden="true">⌖</span>
      <div><small>{initialCityName && !cleared ? "CIUDAD ELEGIDA" : "COBERTURA NACIONAL"}</small><strong>{cityName}</strong></div>
      {nearbyCities.length > 0 && !cleared && <nav aria-label="Otras ciudades de la región">En la región: {nearbyCities.map((city) => <Link key={city.citySlug} href={`/escorts/${city.citySlug}`}>{city.city}</Link>)}</nav>}
      <div className="home-location-actions">
        <button className="home-city-trigger" type="button" aria-expanded={selectorOpen} aria-controls={selectorOpen ? "home-city-selector" : undefined} onClick={() => setSelectorOpen((open) => !open)}>Ir a una ciudad <span aria-hidden="true">{selectorOpen ? "−" : "+"}</span></button>
        {initialCityName && !cleared && <button className="home-location-reset" type="button" onClick={resetLocation}>Ver todo Chile</button>}
      </div>
      {selectorOpen && <div id="home-city-selector" className="home-city-selector"><p>Elige una ciudad disponible</p><div className="home-city-regions">{regions.filter((region) => region.cities.length > 0).map((region) => <section key={region.id} aria-label={region.displayTitle}><h3>{region.displayTitle}</h3><div>{cityDirectory.filter((city) => city.regionSlug === region.id).map((city) => <Link key={city.citySlug} href={`/escorts/${city.citySlug}`} onClick={() => savePreferredCity(city.citySlug)}>{city.city}</Link>)}</div></section>)}</div></div>}
    </aside>
  );
}
