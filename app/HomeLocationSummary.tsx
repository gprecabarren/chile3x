"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearPreferredCity } from "@/app/directorio/location-client";

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
        <Link href="/escorts">Elegir ciudad</Link>
        {initialCityName && !cleared && <button className="home-location-reset" type="button" onClick={resetLocation}>Ver todo Chile</button>}
      </div>
    </aside>
  );
}
