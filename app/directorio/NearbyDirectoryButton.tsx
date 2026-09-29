"use client";

import { useState } from "react";
import { locationErrorMessage, requestNearestCoveredCity, savePreferredCity } from "./location-client";

export function NearbyDirectoryButton() {
  const [message, setMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  async function useLocation() {
    setIsLocating(true);
    setMessage("El navegador solicitará permiso para detectar tu ciudad más cercana…");
    try {
      const nearest = await requestNearestCoveredCity();
      savePreferredCity(nearest.citySlug);
      window.location.assign(`/escorts?cerca=${encodeURIComponent(nearest.city)}`);
    } catch (error) {
      setMessage(locationErrorMessage(error));
      setIsLocating(false);
    }
  }

  return <div className="nearby-directory-control"><button type="button" onClick={useLocation} disabled={isLocating}>{isLocating ? "Buscando…" : "Usar mi ubicación"}</button>{message && <small role="status" aria-live="polite">{message}</small>}</div>;
}
