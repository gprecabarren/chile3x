"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export function ProfileCityAlertPanel({ profileId, profileSlug, displayName, currentCity, availableCities, signedIn, viewerOwnsProfile, initialAlerts }: {
  profileId: string;
  profileSlug: string;
  displayName: string;
  currentCity: string;
  availableCities: string[];
  signedIn: boolean;
  viewerOwnsProfile: boolean;
  initialAlerts: string[];
}) {
  const choices = useMemo(() => availableCities.filter((city) => city !== currentCity), [availableCities, currentCity]);
  const [city, setCity] = useState(choices.find((item) => !initialAlerts.includes(item)) ?? choices[0] ?? "");
  const [alerts, setAlerts] = useState(initialAlerts);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const loginHref = `/ingresar?return_to=${encodeURIComponent(`/perfil/${profileSlug}`)}`;

  async function updateAlert(targetCity: string, intent: "create" | "remove") {
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/perfiles/${profileId}/avisos-ciudad`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ city: targetCity, intent }),
      });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo guardar el aviso.");
      setAlerts((current) => intent === "create" ? [...new Set([...current, targetCity])].sort() : current.filter((item) => item !== targetCity));
      setNotice(payload.message ?? "Aviso actualizado.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar el aviso.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="profile-city-alert-panel">
    <div>
      <p className="eyebrow">AVISO DE CIUDAD</p>
      <h2>¿Quieres ver a {displayName} en tu ciudad?</h2>
      <p>Elige una ciudad del directorio. Si este anuncio cambia oficialmente a esa ciudad y vuelve a ser aprobado, te enviaremos un correo.</p>
    </div>
    {viewerOwnsProfile ? <p className="profile-city-alert-owner">Este es tu anuncio; los avisos de ciudad están disponibles para otras cuentas.</p> : choices.length === 0 ? <p className="profile-city-alert-owner">No hay otra ciudad disponible en el directorio por ahora.</p> : signedIn ? <>
      <div className="profile-city-alert-form">
        <label htmlFor={`city-alert-${profileId}`}>Ciudad</label>
        <select id={`city-alert-${profileId}`} value={city} onChange={(event) => setCity(event.target.value)}>{choices.map((item) => <option value={item} key={item}>{item}</option>)}</select>
        <button className="button button-primary" type="button" disabled={busy || !city || alerts.includes(city)} onClick={() => updateAlert(city, "create")}>{alerts.includes(city) ? "Aviso activo" : "Invitar y avisarme"}</button>
      </div>
      {alerts.length > 0 && <div className="profile-city-alert-active"><strong>Avisos activos</strong>{alerts.map((item) => <span key={item}>{item}<button type="button" disabled={busy} aria-label={`Quitar aviso para ${item}`} onClick={() => updateAlert(item, "remove")}>×</button></span>)}</div>}
    </> : <Link className="button button-outline profile-city-alert-login" href={loginHref}>Inicia sesión para pedir un aviso</Link>}
    <small>Tu correo permanece privado y el aviso se envía una sola vez por ciudad.</small>
    {notice && <p className="profile-city-alert-notice" role="status">{notice}</p>}
  </section>;
}
