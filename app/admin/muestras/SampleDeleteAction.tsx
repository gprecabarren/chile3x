"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";

/** Uses the shared administrative form coordinator for revision checks,
 * mutation receipts, uncertain responses and navigation after completion. */
export function SampleDeleteAction({ id, revision, displayName, returnTo = "/admin/muestras?view=trash" }: { id: string; revision: number; displayName: string; returnTo?: string }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null), confirmation = useRef<HTMLInputElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const regionId = useId(), inputId = useId();
  useEffect(() => {
    if (!open || !form.current) return;
    confirmation.current?.focus({ preventScroll: true });
    const element = form.current;
    const observer = new MutationObserver(() => setBusy(element.getAttribute("aria-busy") === "true"));
    observer.observe(element, { attributes: true, attributeFilter: ["aria-busy"] });
    return () => observer.disconnect();
  }, [open]);
  function close() {
    if (busy) return;
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  return <div className={`sample-delete-action${open ? " is-open" : ""}`}>
    <ActionButton ref={trigger} className="button button-outline" type="button" aria-expanded={open} aria-controls={regionId} disabled={busy} onClick={() => open ? close() : setOpen(true)}><ActionIcon name="trash" />Eliminar definitivamente</ActionButton>
    {open && <form ref={form} id={regionId} className="sample-delete-confirmation" action={`/api/admin/muestras/${encodeURIComponent(id)}`} method="post" aria-label={`Eliminar definitivamente la muestra de ${displayName}`}>
      <input type="hidden" name="sample_action" value="delete" /><input type="hidden" name="review_key" value={`sample:${id}`} /><input type="hidden" name="review_revision" value={revision} /><input type="hidden" name="return_to" value={returnTo} />
      <strong>Eliminar la muestra de {displayName}</strong>
      <p>Se borrarán la muestra y los archivos que todavía le pertenecen. Esta acción no se puede deshacer. Los medios transferidos a un anuncio real se conservan.</p>
      <label htmlFor={inputId}>Escribe ELIMINAR para confirmar<input ref={confirmation} id={inputId} name="confirmation" pattern="ELIMINAR" maxLength={8} required autoComplete="off" spellCheck={false} disabled={busy} /></label>
      <div className="sample-delete-confirmation-actions"><ActionButton className="button button-danger" type="submit" disabled={busy}>{busy ? "Eliminando muestra…" : "Confirmar eliminación definitiva"}</ActionButton><ActionButton className="button button-outline" type="button" disabled={busy} onClick={close}>Cancelar</ActionButton></div>
    </form>}
  </div>;
}
