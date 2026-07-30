"use client";

import { useEffect, useState } from "react";

const storageKey = "chile3x-age-confirmed";

export function AgeGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(window.localStorage.getItem(storageKey) !== "yes"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function confirmAge() {
    window.localStorage.setItem(storageKey, "yes");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="age-gate" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className="age-gate-card">
        <span className="age-gate-mark">+18</span>
        <p className="eyebrow">ACCESO PARA ADULTOS</p>
        <h1 id="age-gate-title">Confirma tu edad</h1>
        <p>Este sitio contiene un directorio destinado exclusivamente a personas mayores de 18 años. Al continuar declaras tener la edad legal para acceder a este contenido en Chile.</p>
        <div className="age-gate-actions">
          <button className="button button-primary" type="button" onClick={confirmAge}>Soy mayor de 18 años</button>
          <a className="button button-outline" href="https://www.google.com/">Salir del sitio</a>
        </div>
        <small>Consulta nuestros <a href="/terminos">términos</a>, <a href="/privacidad">privacidad</a> y <a href="/reglas-de-publicacion">reglas de publicación</a>.</small>
      </div>
    </div>
  );
}
