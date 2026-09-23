"use client";

import { useEffect, useState } from "react";

export const analyticsConsentCookie = "chile3x_analytics_consent";
const googleTagManagerId = "GTM-NCJ3ZNH3";
const consentDurationSeconds = 60 * 60 * 24 * 180;

type AnalyticsConsent = "granted" | "necessary" | null;

function readConsent(): AnalyticsConsent {
  if (typeof document === "undefined") return null;
  const value = document.cookie.split("; ").find((item) => item.startsWith(`${analyticsConsentCookie}=`))?.split("=")[1];
  return value === "granted" || value === "necessary" ? value : null;
}

export function hasAnalyticsConsent() {
  return readConsent() === "granted";
}

function saveConsent(consent: Exclude<AnalyticsConsent, null>) {
  document.cookie = `${analyticsConsentCookie}=${consent}; Max-Age=${consentDurationSeconds}; Path=/; SameSite=Lax; Secure`;
}

function loadGoogleTagManager() {
  if (document.getElementById("google-tag-manager")) return;

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  const script = document.createElement("script");
  script.id = "google-tag-manager";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${googleTagManagerId}`;
  document.head.append(script);
}

function deferGoogleTagManager() {
  let loaded = false;
  const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "scroll"];
  const load = () => {
    if (loaded) return;
    loaded = true;
    window.clearTimeout(timer);
    events.forEach((event) => window.removeEventListener(event, load));
    loadGoogleTagManager();
  };
  // Returning visitors who already consented should not pay the full Tag
  // Manager parse cost during the critical render. Real interaction loads it
  // immediately; the fallback still records visits that remain open.
  const timer = window.setTimeout(load, 12_000);
  events.forEach((event) => window.addEventListener(event, load, { passive: true }));
  return () => {
    window.clearTimeout(timer);
    events.forEach((event) => window.removeEventListener(event, load));
  };
}

export function PrivacyConsent() {
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<AnalyticsConsent>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let cancelDeferredAnalytics: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      const storedConsent = readConsent();
      const openPreferences = new URLSearchParams(window.location.search).get("medicion") === "editar";
      setConsent(storedConsent);
      setShowBanner(openPreferences || storedConsent === null);
      setReady(true);
      if (storedConsent === "granted") cancelDeferredAnalytics = deferGoogleTagManager();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      cancelDeferredAnalytics?.();
    };
  }, []);

  function chooseConsent(nextConsent: Exclude<AnalyticsConsent, null>) {
    saveConsent(nextConsent);
    if (nextConsent === "necessary" && consent === "granted") {
      window.location.reload();
      return;
    }
    setConsent(nextConsent);
    setShowBanner(false);
    if (nextConsent === "granted") loadGoogleTagManager();
  }

  if (!ready || !showBanner) return null;

  return (
    <section className="privacy-consent" role="dialog" aria-modal="false" aria-labelledby="privacy-consent-title">
      <div>
        <p className="eyebrow">TU ELECCIÓN</p>
        <h2 id="privacy-consent-title">Privacidad y medición</h2>
        <p>Usamos almacenamiento y cookies necesarias para que Chile3X funcione. Con tu permiso, medimos visitas y acciones generales sin enviar nombres, correos, teléfonos, RUT, direcciones, archivos ni otros datos personales a Google.</p>
      </div>
      <div className="privacy-consent-actions">
        <button className="button button-primary" type="button" onClick={() => chooseConsent("granted")}>Aceptar medición</button>
        <button className="button button-outline" type="button" onClick={() => chooseConsent("necessary")}>Solo necesarias</button>
        <a href="/privacidad#medicion">Ver política</a>
      </div>
    </section>
  );
}
