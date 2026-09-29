"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { locationErrorMessage, requestNearestCoveredCity, savePreferredCity } from "@/app/directorio/location-client";

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
  const [status, setStatus] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const cityName = detectedCity || initialCityName || "Todo Chile";

  async function useLocation() {
    setIsLocating(true);
    setStatus("El navegador solicitará permiso para detectar tu ciudad más cercana…");
    try {
      const nearest = await requestNearestCoveredCity();
      savePreferredCity(nearest.citySlug);
      setDetectedCity(nearest.city);
      setStatus(`Ubicación encontrada. Priorizaremos ${nearest.city} y sectores cercanos.`);
      router.refresh();
    } catch (error) {
      setStatus(locationErrorMessage(error));
    } finally {
      setIsLocating(false);
    }
  }

  return (
    <aside className="home-location-summary" aria-label="Ubicación priorizada">
      <span aria-hidden="true">⌖</span>
      <div><small>{initialCityName || detectedCity ? "MOSTRANDO PRIMERO" : "COBERTURA NACIONAL"}</small><strong>{cityName}</strong></div>
      {nearbyCities.length > 0 && <nav aria-label="Ciudades cercanas">Cerca: {nearbyCities.map((city) => <Link key={city.citySlug} href={`/escorts/${city.citySlug}`}>{city.city}</Link>)}</nav>}
      <div className="home-location-actions">
        <button type="button" onClick={useLocation} disabled={isLocating}>{isLocating ? "Buscando…" : "Usar mi ubicación"}</button>
        <Link href="/escorts">Elegir ciudad</Link>
      </div>
      {status && <small className="home-location-status" role="status" aria-live="polite">{status}</small>}
    </aside>
  );
}
