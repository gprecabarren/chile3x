"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cityDirectory, cityGeoDirectory, regions } from "@/app/locations";

function distanceSquared(latitude: number, longitude: number, targetLatitude: number, targetLongitude: number) {
  const latitudeScale = Math.cos(((latitude + targetLatitude) / 2) * Math.PI / 180);
  return (latitude - targetLatitude) ** 2 + ((longitude - targetLongitude) * latitudeScale) ** 2;
}

function savePreferredCity(citySlug: string) {
  document.cookie = `chile3x_preferred_city=${encodeURIComponent(citySlug)}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
}

export function LocationPreference({ initialCitySlug = "" }: { initialCitySlug?: string }) {
  const initialCity = cityDirectory.find((item) => item.citySlug === initialCitySlug);
  const [regionSlug, setRegionSlug] = useState(initialCity?.regionSlug ?? "");
  const [citySlug, setCitySlug] = useState(initialCity?.citySlug ?? "");
  const [status, setStatus] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const cities = useMemo(() => cityDirectory.filter((item) => !regionSlug || item.regionSlug === regionSlug), [regionSlug]);

  function destinationFor(city: (typeof cityDirectory)[number]) {
    const base = pathname.startsWith("/agencias") ? "/agencias" : pathname.startsWith("/arriendos") ? "/arriendos" : "/escorts";
    const query = new URLSearchParams({ region: city.region, ciudad: city.city, cerca: city.city });
    return `${base}?${query.toString()}`;
  }

  function applyCity(nextCitySlug = citySlug) {
    const city = cityDirectory.find((item) => item.citySlug === nextCitySlug);
    if (!city) return setStatus("Selecciona una ciudad para continuar.");
    savePreferredCity(city.citySlug);
    setRegionSlug(city.regionSlug);
    setCitySlug(city.citySlug);
    setStatus(`Priorizando ${city.city}.`);
    router.push(destinationFor(city));
  }

  function useLocation() {
    if (!navigator.geolocation) return setStatus("Tu navegador no permite usar ubicación.");
    setStatus("Consultando tu ubicación con tu permiso…");
    navigator.geolocation.getCurrentPosition((position) => {
      const nearest = cityGeoDirectory.reduce((current, city) => {
        if (!current) return city;
        const candidate = distanceSquared(position.coords.latitude, position.coords.longitude, city.latitude, city.longitude);
        const currentDistance = distanceSquared(position.coords.latitude, position.coords.longitude, current.latitude, current.longitude);
        return candidate < currentDistance ? city : current;
      }, cityGeoDirectory[0]);
      if (!nearest) return setStatus("No hay ciudades de cobertura configuradas.");
      applyCity(nearest.citySlug);
    }, () => setStatus("No compartiste tu ubicación. Puedes elegir una ciudad manualmente."), { enableHighAccuracy: false, timeout: 8_000, maximumAge: 900_000 });
  }

  return <section className="quick-location" aria-label="Cambiar ciudad o región">
    <div className="quick-location-heading"><span aria-hidden="true">⌖</span><strong>Explorar cerca de</strong></div>
    <label><span>Región</span><select value={regionSlug} onChange={(event) => { setRegionSlug(event.target.value); setCitySlug(""); }}><option value="">Todas</option>{regions.map((region) => <option value={region.id} key={region.id}>{region.shortTitle}</option>)}</select></label>
    <label><span>Ciudad</span><select value={citySlug} onChange={(event) => setCitySlug(event.target.value)}><option value="">Elegir ciudad</option>{cities.map((city) => <option value={city.citySlug} key={city.citySlug}>{city.city}</option>)}</select></label>
    <button className="quick-location-apply" type="button" onClick={() => applyCity()}>Aplicar</button>
    <button className="quick-location-detect" type="button" onClick={useLocation}>Usar mi ubicación</button>
    {status && <small role="status">{status}</small>}
  </section>;
}
