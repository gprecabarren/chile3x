"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function ForumForm({ children, label = "Guardar cambios" }: { children: ReactNode; label?: string }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const fields = new URLSearchParams();
    for (const [key, value] of new FormData(form)) if (typeof value === "string") fields.append(key, value);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/foro", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }, body: fields });
      const result = await response.json().catch(() => { throw new Error("No se pudo leer la respuesta del servidor. Revisa el foro antes de repetir la operación."); });
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "No se pudo guardar. Recarga e inténtalo nuevamente.");
      if (typeof result.redirectTo !== "string" || !/^\/foro(?:[/?#]|$)/.test(result.redirectTo)) throw new Error("La operación se completó, pero no se pudo abrir su resultado. Recarga el foro antes de repetirla.");
      if (fields.get("action") === "post_create") form.reset();
      router.push(result.redirectTo); router.refresh();
    } catch (error) { setError(error instanceof TypeError ? "No se pudo confirmar la operación. Revisa tu conexión y el foro antes de repetirla." : error instanceof Error ? error.message : "No se pudo confirmar la operación. Revisa el foro antes de repetirla."); }
    finally { setBusy(false); }
  }
  return <form action="/api/admin/foro" method="post" className="forum-form" aria-busy={busy} onSubmit={submit}>
    <fieldset disabled={busy}>{children}<button type="submit" className="button button-primary">{busy ? "Guardando…" : label}</button></fieldset>
    {error && <p className="form-alert" role="alert">{error}</p>}
  </form>;
}
