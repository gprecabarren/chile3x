"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clearPreferredCity, locationErrorMessage, requestNearestCoveredCity, savePreferredCity } from "@/app/directorio/location-client";

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
  const [detectedCity, setDetectedCity] = useState("");
  const [transientStatus, setStatus] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const cityName = detectedCity || initialCityName || "Todo Chile";

  async function useLocation() {
    setIsLocating(true);
    setStatus("Buscando la ciudad más cercana…");
    try {
      const nearest = await requestNearestCoveredCity();
      savePreferredCity(nearest.citySlug);
      setDetectedCity(nearest.city);
      setStatus(`Ubicación del dispositivo encontrada. Priorizaremos ${nearest.city} y sectores cercanos.`);
      router.refresh();
    } catch (error) {
      setStatus(locationErrorMessage(error));
    } finally {
      setIsLocating(false);
    }
  }

  function resetLocation() {
    clearPreferredCity();
    setDetectedCity("");
    setStatus("Se restableció la cobertura nacional.");
    router.refresh();
  }

  return (
    <aside className="home-location-summary" aria-label="Ubicación priorizada">
      <span aria-hidden="true">⌖</span>
      <div><small>{initialCityName || detectedCity ? "CIUDAD PRIORIZADA" : "COBERTURA NACIONAL"}</small><strong>{cityName}</strong></div>
      {nearbyCities.length > 0 && <nav aria-label="Ciudades cercanas">Cerca: {nearbyCities.map((city) => <Link key={city.citySlug} href={`/escorts/${city.citySlug}`}>{city.city}</Link>)}</nav>}
      <div className="home-location-actions">
        <button type="button" onClick={useLocation} disabled={isLocating}>{isLocating ? "Buscando…" : "Usar mi ubicación"}</button>
        <Link href="/escorts">Elegir ciudad</Link>
        {(initialCityName || detectedCity) && <button className="home-location-reset" type="button" onClick={resetLocation}>Ver todo Chile</button>}
      </div>
      {transientStatus && <small className="home-location-status" role="status" aria-live="polite">{transientStatus}</small>}
    </aside>
  );
}
