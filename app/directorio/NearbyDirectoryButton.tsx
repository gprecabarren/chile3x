"use client";

import { useState } from "react";
import { cityGeoDirectory } from "@/app/locations";

function distanceSquared(latitude: number, longitude: number, targetLatitude: number, targetLongitude: number) {
  const latitudeScale = Math.cos(((latitude + targetLatitude) / 2) * Math.PI / 180);
  return (latitude - targetLatitude) ** 2 + ((longitude - targetLongitude) * latitudeScale) ** 2;
}

export function NearbyDirectoryButton() {
  const [message, setMessage] = useState("");

  function useLocation() {
    if (!navigator.geolocation) {
      setMessage("Tu navegador no permite usar ubicación. Puedes elegir una ciudad desde los filtros.");
      return;
    }

    setMessage("Consultando tu ubicación…");
    navigator.geolocation.getCurrentPosition((position) => {
      const nearest = cityGeoDirectory.reduce((current, city) => {
        if (!current) return city;
        const candidateDistance = distanceSquared(position.coords.latitude, position.coords.longitude, city.latitude, city.longitude);
        const currentDistance = distanceSquared(position.coords.latitude, position.coords.longitude, current.latitude, current.longitude);
        return candidateDistance < currentDistance ? city : current;
      }, cityGeoDirectory[0]);

      if (!nearest) {
        setMessage("No hay una ciudad de cobertura configurada todavía.");
        return;
      }

      window.location.assign(`/escorts?cerca=${encodeURIComponent(nearest.city)}`);
    }, () => setMessage("No compartiste tu ubicación. Puedes continuar explorando todo Chile."), { enableHighAccuracy: false, timeout: 8000, maximumAge: 900000 });
  }

  return <div className="nearby-directory-control"><button type="button" onClick={useLocation}>Usar mi ubicación</button>{message && <small role="status">{message}</small>}</div>;
}
