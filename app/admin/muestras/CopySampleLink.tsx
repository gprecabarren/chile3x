"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";
import { SAMPLE_TOKEN, type SampleStatus } from "@/lib/private-sample-policy";

export function SampleLinkStatus({ id, status, label }: { id: string; status: SampleStatus; label: string }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const committed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.key === `sample:${id}` && detail.sampleShared === true) setEnabled(true);
    };
    window.addEventListener("chile3x:own-review-commit", committed);
    return () => window.removeEventListener("chile3x:own-review-commit", committed);
  }, [id]);
  const active = status === "unshared" && enabled;
  return <span className={`sample-status is-${active ? "active" : status}`}>{active ? "Enlace habilitado" : label}</span>;
}

export function CopySampleLink({ id, revision, shared, legacyLink = false }: { id: string; revision: number; shared: boolean; legacyLink?: boolean }) {
  const root = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null), currentRevision = useRef(revision);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [manualLink, setManualLink] = useState(""), [enabled, setEnabled] = useState(shared);
  const inputId = useId();
  useEffect(() => {
    const committed = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.key === `sample:${id}` && detail.previousRevision === currentRevision.current && Number.isSafeInteger(detail.revision)) currentRevision.current = detail.revision;
    };
    window.addEventListener("chile3x:own-review-commit", committed);
    return () => window.removeEventListener("chile3x:own-review-commit", committed);
  }, [id]);

  async function prepareLink() {
    const scope = root.current?.closest<HTMLElement>("[data-review-resource]");
    const previousRevision = Number(scope?.dataset.reviewRevision ?? currentRevision.current);
    const body = new FormData();
    body.set("sample_action", "share"); body.set("review_key", `sample:${id}`); body.set("review_revision", String(previousRevision));
    const response = await fetch(`/api/admin/muestras/${encodeURIComponent(id)}`, { method: "POST", body, headers: { accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || "No se pudo recuperar el enlace. Revisa la muestra antes de repetirlo.");
    if (typeof result?.url !== "string" || !Number.isSafeInteger(result.revision) || result.revision < previousRevision) throw new Error("No se pudo confirmar el enlace privado.");
    const url = new URL(result.url);
    if (url.origin !== location.origin || !/^\/muestra\/[a-z0-9_-]+$/.test(url.pathname) || !SAMPLE_TOKEN.test(url.hash.slice(1))) throw new Error("No se pudo confirmar el enlace privado.");
    currentRevision.current = result.revision;
    setEnabled(true);
    window.dispatchEvent(new CustomEvent("chile3x:own-review-commit", { detail: { key: `sample:${id}`, previousRevision, revision: result.revision, sampleShared: true } }));
    return url.href;
  }

  async function copy() {
    if (busy) return;
    setBusy(true); setMessage(""); setManualLink("");
    // Start the Clipboard API within the click gesture. Safari permits an
    // asynchronous ClipboardItem payload without losing the user activation.
    const pending = prepareLink();
    void pending.catch(() => {});
    try {
      try {
        if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
          const payload = pending.then(link => new Blob([link], { type: "text/plain" }));
          void payload.catch(() => {});
          await navigator.clipboard.write([new ClipboardItem({ "text/plain": payload })]);
        } else {
          const link = await pending;
          if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable");
          await navigator.clipboard.writeText(link);
        }
        setMessage(legacyLink ? "Enlace copiado. El enlace anterior vigente también se conserva." : "Enlace privado copiado.");
      } catch {
        const link = await pending;
        setManualLink(link);
        setMessage("El navegador no permitió copiar automáticamente. Selecciona y copia el enlace de abajo.");
      }
    } catch (error) {
      setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "No se pudo confirmar la respuesta. Revisa la muestra antes de repetirlo.");
    } finally { setBusy(false); }
  }

  return <div className="sample-copy-link" ref={root} aria-busy={busy}>
    <ActionButton className="button button-outline" type="button" disabled={busy} onClick={() => void copy()} title="Copia el enlace privado sin cambiar su vencimiento."><ActionIcon name="copy" />{busy ? "Preparando enlace…" : enabled ? "Copiar enlace" : "Crear y copiar enlace"}</ActionButton>
    {message && <p className="sample-copy-status" role="status">{message}</p>}
    {manualLink && <div className="sample-copy-fallback"><label htmlFor={inputId}>Enlace privado</label><input ref={input} id={inputId} type="text" readOnly value={manualLink} autoComplete="off" spellCheck={false} onFocus={event => event.currentTarget.select()} /><ActionButton className="button button-outline" type="button" onClick={() => { input.current?.focus(); input.current?.select(); }}>Seleccionar enlace</ActionButton></div>}
  </div>;
}
