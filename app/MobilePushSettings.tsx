"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/app/ActionButton";

type Settings = { publicKey: string; enabled: boolean; auditEnabled: boolean };
type InstallPrompt = Event & { prompt: () => Promise<unknown> };
const endpoint = "/api/avisos-moviles";
const serviceWorker = "/mobile-push-worker.js";

function applicationKey(value: string) {
  return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/") + "="), char => char.charCodeAt(0));
}

export function MobilePushSettings({ admin = false }: { admin?: boolean }) {
  const [settings, setSettings] = useState<Settings>();
  const [registered, setRegistered] = useState(false);
  const [audit, setAudit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt>();
  const [installed, setInstalled] = useState(false);
  const [supported, setSupported] = useState<boolean>();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const mode = matchMedia("(display-mode: standalone)");
    const installEvent = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const checkInstallation = () => setInstalled(mode.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    const initialize = async () => {
      checkInstallation();
      const canPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      setSupported(canPush);
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        const current = await response.json();
        if (!response.ok) throw new Error(current.error);
        if (canPush) await navigator.serviceWorker.register(serviceWorker, { updateViaCache: "none" });
        const worker = canPush ? await navigator.serviceWorker.ready : undefined;
        const currentSubscription = await worker?.pushManager.getSubscription() ?? null;
        if (!controller.signal.aborted) {
          setRegistration(worker);
          setSubscription(currentSubscription);
          setRegistered(current.enabled);
          setSettings({ ...current, enabled: canPush && current.enabled && Boolean(currentSubscription) && Notification.permission === "granted" });
          setAudit(current.auditEnabled);
        }
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "No se pudo consultar el estado.");
      }
    };
    void initialize();
    window.addEventListener("beforeinstallprompt", installEvent);
    window.addEventListener("appinstalled", checkInstallation);
    mode.addEventListener("change", checkInstallation);
    return () => {
      controller.abort();
      window.removeEventListener("beforeinstallprompt", installEvent);
      window.removeEventListener("appinstalled", checkInstallation);
      mode.removeEventListener("change", checkInstallation);
    };
  }, []);

  async function save(action: "enable" | "disable" | "test") {
    if (!settings || !registration || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const payload: Record<string, unknown> = { action };
      if (action === "enable") {
        if (Notification.permission === "denied") throw new Error("Permite las notificaciones en los ajustes del navegador o del teléfono.");
        const applicationServerKey = applicationKey(settings.publicKey);
        let selected = subscription;
        if (selected) {
          const oldKey = new Uint8Array(selected.options.applicationServerKey ?? new ArrayBuffer(0));
          if (oldKey.length !== applicationServerKey.length || !oldKey.every((byte, index) => byte === applicationServerKey[index])) {
            await selected.unsubscribe();
            selected = null;
            setSubscription(null);
            throw new Error("Se renovó la clave de avisos. Pulsa nuevamente para activar las notificaciones.");
          }
        }
        selected ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
        setSubscription(selected);
        payload.subscription = selected.toJSON();
        payload.audit = audit;
      }
      const request = new AbortController();
      const timeout = window.setTimeout(() => request.abort(), 10000);
      const response = await fetch(endpoint, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: request.signal,
      }).finally(() => window.clearTimeout(timeout));
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo guardar la configuración.");
      if (action === "test") {
        setMessage("Aviso de prueba en cola. Puede tardar unos minutos.");
        return;
      }
      if (action === "disable") {
        await subscription?.unsubscribe().catch(() => {});
        setSubscription(null);
      }
      setSettings({ ...settings, enabled: result.enabled, auditEnabled: Boolean(result.auditEnabled) });
      setRegistered(result.enabled);
      setMessage(action === "enable" ? "Notificaciones activadas en este dispositivo." : "Notificaciones desactivadas en este dispositivo.");
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Permite las notificaciones en los ajustes del navegador o del teléfono."
        : error instanceof Error ? error.message : "No se pudo cambiar el estado de las notificaciones.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mobile-push-settings">
    <section className="profile-form-section">
      <h2>Instala Chile3X</h2>
      {installed ? <p>Estás usando Chile3X desde la app instalada.</p> : <>
        {installPrompt && <ActionButton className="button button-outline" type="button" onClick={() => {
          void installPrompt.prompt().catch(() => setMessage("Usa el menú del navegador para instalar Chile3X."));
          setInstallPrompt(undefined);
        }}>Instalar Chile3X</ActionButton>}
        <ol>
          <li><strong>iPhone o iPad.</strong> En Safari, toca Compartir y elige <strong>Agregar a pantalla de inicio</strong>. Abre Chile3X desde el ícono y activa las notificaciones allí.</li>
          <li><strong>Android.</strong> En Chrome, abre el menú y elige <strong>Instalar app</strong> o <strong>Agregar a pantalla principal</strong>.</li>
        </ol>
      </>}
    </section>
    <section className="profile-form-section">
      <h2>Avisos en este dispositivo</h2>
      <p>{admin ? "Recibe avisos de nuevas cuentas, anuncios y archivos para revisar. Puedes añadir los movimientos del historial administrativo." : "Recibe un aviso al recibir un mensaje o cuando se apruebe uno de tus anuncios."}</p>
      <p>Al tocar un aviso se abre la sección correspondiente de Chile3X. Los avisos aparecen sin el texto del mensaje ni datos de las cuentas.</p>
      {admin && <label className="checkbox-label"><input type="checkbox" checked={audit} disabled={busy || !registration} onChange={event => setAudit(event.target.checked)} />Incluir todos los movimientos del historial administrativo</label>}
      <div className="mobile-push-actions">
        {registration && settings && !settings.enabled && <ActionButton className="button button-primary" type="button" disabled={busy} onClick={() => void save("enable")}>Activar notificaciones</ActionButton>}
        {supported && settings?.enabled && <>
          {admin && audit !== settings.auditEnabled && <ActionButton className="button button-primary" type="button" disabled={busy} onClick={() => void save("enable")}>Guardar preferencias</ActionButton>}
          <ActionButton className="button button-outline" type="button" disabled={busy} onClick={() => void save("test")}>Enviar aviso de prueba</ActionButton>
        </>}
        {registered && registration && <ActionButton className="button button-outline" type="button" disabled={busy} onClick={() => void save("disable")}>Desactivar notificaciones</ActionButton>}
      </div>
      {supported === false && <p>Para recibir avisos en iPhone o iPad, abre la app desde la pantalla de inicio con iOS o iPadOS 16.4 o posterior. En Android, usa un navegador compatible como Chrome.</p>}
      {message && <p role="status">{message}</p>}
    </section>
  </div>;
}
