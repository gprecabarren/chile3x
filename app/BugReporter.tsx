"use client";

import { useEffect, useState } from "react";

type Context = {
  pageUrl: string;
  pageTitle: string;
  deviceType: "desktop" | "mobile";
  viewport: string;
  userAgent: string;
};

export function BugReporter() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [context, setContext] = useState<Context | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const updateContext = () => setContext({
      pageUrl: `${window.location.pathname}${window.location.search}`,
      pageTitle: document.title,
      deviceType: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
      viewport: `${window.innerWidth} × ${window.innerHeight}`,
      userAgent: navigator.userAgent.slice(0, 500),
    });
    updateContext();
    window.addEventListener("resize", updateContext);
    return () => window.removeEventListener("resize", updateContext);
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/bugs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description, ...context }),
      });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo enviar el reporte.");
      setTitle(""); setDescription(""); setNotice(payload.message ?? "Reporte enviado al administrador.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo enviar el reporte.");
    } finally { setBusy(false); }
  }

  return <aside className="tester-reporter" aria-label="Herramientas de prueba">
    <button type="button" className="tester-reporter-trigger" onClick={() => { setOpen((value) => !value); setNotice(""); }} aria-expanded={open}>🐞 <span>Reportar bug</span></button>
    {open && <form className="tester-reporter-form" onSubmit={submit}>
      <header><div><p>HERRAMIENTAS DE TESTER</p><h2>Reportar un problema</h2></div><button type="button" aria-label="Cerrar reporte" onClick={() => setOpen(false)}>×</button></header>
      <p>Este reporte llegará sólo al panel de administración. La página, dispositivo y navegador se adjuntan automáticamente.</p>
      <label>Resumen<input required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. El menú no se puede cerrar" /></label>
      <label>¿Qué ocurrió y cómo repetirlo?<textarea required minLength={10} maxLength={2000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Indica los pasos, resultado esperado y resultado obtenido." /></label>
      {context && <dl><div><dt>Página</dt><dd>{context.pageUrl}</dd></div><div><dt>Entorno</dt><dd>{context.deviceType === "mobile" ? "Móvil" : "Escritorio"} · {context.viewport}</dd></div></dl>}
      <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar reporte"}</button>
      {notice && <p className="tester-reporter-notice" role="status">{notice}</p>}
    </form>}
  </aside>;
}
