"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { TURNSTILE_PROFILE_REPORT_ACTION, TURNSTILE_PROFILE_REVIEW_SITEKEY } from "@/lib/turnstile";
import { TurnstileWidget } from "./TurnstileWidget";

export function ProfileSafetyActions({ profileId, profileSlug, signedIn }: { profileId: string; profileSlug: string; signedIn: boolean }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("wrong_information");
  const [body, setBody] = useState("");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const onToken = useCallback((value: string) => setToken(value), []);
  const onError = useCallback((value: string) => setNotice(value), []);

  async function report(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return setNotice("Completa la verificación antispam.");
    setBusy(true); setNotice("");
    const data = new FormData(); data.set("reason", reason); data.set("body", body); data.set("cf-turnstile-response", token);
    try {
      const response = await fetch(`/api/perfiles/${profileId}/reportes`, { method: "POST", body: data });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo enviar el reporte.");
      setBody(""); setNotice(payload.message ?? "Reporte enviado."); setResetKey((value) => value + 1); setToken("");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo enviar el reporte."); }
    finally { setBusy(false); }
  }

  async function block() {
    if (!signedIn) return;
    if (!window.confirm("¿Quieres ocultar este anuncio? Podrás recuperarlo desde Mi cuenta.")) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/perfiles/${profileId}/bloqueo`, { method: "POST" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo ocultar el anuncio.");
      window.location.assign("/escorts");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "No se pudo ocultar el anuncio."); setBusy(false); }
  }

  return <section className="profile-safety-actions">
    <button type="button" onClick={() => setReportOpen((value) => !value)}>⚑ Reportar anuncio</button>
    {signedIn ? <button type="button" disabled={busy} onClick={block}>Ocultar anuncio</button> : <Link href={`/ingresar?return_to=${encodeURIComponent(`/perfil/${profileSlug}`)}`}>Inicia sesión para ocultarlo</Link>}
    {reportOpen && <form className="profile-report-form" onSubmit={report}>
      <div><strong>Reporte privado para Chile3X</strong><button type="button" aria-label="Cerrar" onClick={() => setReportOpen(false)}>×</button></div>
      <label>Motivo<select value={reason} onChange={(event) => setReason(event.target.value)}><option value="wrong_information">Información incorrecta</option><option value="impersonation">Suplantación de identidad</option><option value="fraud">Posible fraude</option><option value="underage">Posible persona menor de edad</option><option value="inappropriate">Contenido que incumple las reglas</option><option value="other">Otro motivo</option></select></label>
      <label>Cuéntanos qué ocurre<textarea required minLength={10} maxLength={1000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} /></label>
      <TurnstileWidget action={TURNSTILE_PROFILE_REPORT_ACTION} sitekey={TURNSTILE_PROFILE_REVIEW_SITEKEY} resetKey={resetKey} onToken={onToken} onError={onError} />
      <button className="button button-primary" type="submit" disabled={busy || !token}>{busy ? "Enviando…" : "Enviar reporte"}</button>
      {notice && <p role="status">{notice}</p>}
    </form>}
  </section>;
}
