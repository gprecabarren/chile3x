"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { locationErrorMessage, requestNearestCoveredCity, savePreferredCity } from "@/app/directorio/location-client";

type NearbyCity = {
  city: string;
  citySlug: string;
};

function subscribeToLocationHint() { return () => {}; }
function readLocationHint() {
  try { return window.sessionStorage.getItem("chile3x_location_hint") ?? ""; } catch { return ""; }
}
function noServerLocationHint() { return ""; }

export function HomeLocationSummary({
  initialCityName,
  initialCitySlug,
  nearbyCities,
}: {
  initialCityName?: string;
  initialCitySlug?: string;
  nearbyCities: readonly NearbyCity[];
}) {
  const router = useRouter();
  const [detectedCity, setDetectedCity] = useState("");
  const [transientStatus, setStatus] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const networkHintCitySlug = useSyncExternalStore(subscribeToLocationHint, readLocationHint, noServerLocationHint);
  const cityName = detectedCity || initialCityName || "Todo Chile";
  const status = transientStatus || (initialCitySlug && networkHintCitySlug === initialCitySlug
    ? `Ubicación aproximada por tu conexión: ${initialCityName}. Puede variar; también puedes elegir otra ciudad.`
    : "");

  async function useLocation() {
    setIsLocating(true);
    setStatus("Buscando la ciudad más cercana…");
    try {
      const nearest = await requestNearestCoveredCity();
      savePreferredCity(nearest.citySlug);
      if (nearest.source === "network") {
        try { window.sessionStorage.setItem("chile3x_location_hint", nearest.citySlug); } catch { /* Aviso ya visible antes de actualizar. */ }
      }
      setDetectedCity(nearest.city);
      setStatus(nearest.source === "network"
        ? `Ubicación aproximada por tu conexión: ${nearest.city}. Puede variar; también puedes elegir otra ciudad.`
        : `Ubicación encontrada. Priorizaremos ${nearest.city} y sectores cercanos.`);
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
