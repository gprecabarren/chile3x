"use client";

import { useState } from "react";

type TelegramLaunch = {
  universalUrl: string;
  nativeUrl: string;
};

function validTelegramLaunch(value: unknown): value is TelegramLaunch {
  if (!value || typeof value !== "object") return false;
  const launch = value as Partial<TelegramLaunch>;
  try {
    const universal = new URL(launch.universalUrl ?? "");
    const native = new URL(launch.nativeUrl ?? "");
    return universal.protocol === "https:"
      && universal.hostname === "t.me"
      && native.protocol === "tg:"
      && native.hostname === "resolve";
  } catch {
    return false;
  }
}

export function TelegramLinkLauncher({ endpoint, label }: { endpoint: string; label: string }) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [launch, setLaunch] = useState<TelegramLaunch | null>(null);
  const [error, setError] = useState("");

  async function openTelegram() {
    if (isPreparing) return;
    setIsPreparing(true);
    setError("");

    // En PC se abre una pestaña inmediatamente desde el gesto del usuario para
    // que ningún bloqueador confunda la espera de D1 con un popup automático.
    // En móvil se conserva la pestaña actual para que el enlace universal pueda
    // entregar el control directamente a Telegram para iOS o Android.
    const launchWindow = window.matchMedia("(min-width: 861px)").matches
      ? window.open("about:blank", "_blank")
      : null;
    if (launchWindow) {
      launchWindow.opener = null;
      launchWindow.document.title = "Abriendo Telegram";
      launchWindow.document.body.textContent = "Preparando el vínculo seguro con Telegram…";
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const payload = await response.json().catch(() => null) as ({ error?: string } & Partial<TelegramLaunch>) | null;
      if (!response.ok || !validTelegramLaunch(payload)) {
        throw new Error(payload?.error || "No pudimos preparar el enlace de Telegram.");
      }

      setLaunch(payload);
      if (launchWindow && !launchWindow.closed) launchWindow.location.replace(payload.universalUrl);
      else window.location.assign(payload.universalUrl);
    } catch (reason) {
      if (launchWindow && !launchWindow.closed) launchWindow.close();
      setError(reason instanceof Error ? reason.message : "No pudimos abrir Telegram.");
      setIsPreparing(false);
    }
  }

  return <div className="telegram-link-launcher">
    <button className="button button-primary" type="button" onClick={openTelegram} disabled={isPreparing}>
      {isPreparing ? "Abriendo Telegram…" : label}
    </button>
    {launch && <div className="telegram-launch-fallback" role="status">
      <strong>¿Telegram no se abrió?</strong>
      <p>Usa una de estas opciones con el mismo vínculo temporal. Funciona con Telegram para iOS, Android, Windows y macOS, o mediante t.me en el navegador.</p>
      <div>
        <a className="button button-outline" href={launch.nativeUrl}>Abrir la aplicación</a>
        <a className="button button-outline" href={launch.universalUrl} target="_blank" rel="noreferrer">Abrir mediante t.me</a>
      </div>
    </div>}
    {error && <p className="telegram-launch-error" role="alert">{error} Recarga la página e inténtalo nuevamente.</p>}
  </div>;
}
