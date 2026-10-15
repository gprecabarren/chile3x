"use client";
import { useEffect, useState } from "react";
import Link from "@/app/NavigationLink";
import type { ModerationInboxData } from "@/lib/moderation-inbox";

export function ModerationInbox({ initial, canProfiles, canMedia, canAudit }: { initial: ModerationInboxData; canProfiles: boolean; canMedia: boolean; canAudit: boolean }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      if (document.visibilityState !== "visible") return;
      try { const response = await fetch("/api/admin/moderacion-resumen", { cache: "no-store", signal: controller.signal }); if (!response.ok) throw new Error(); setData(await response.json()); setError(""); } catch { if (!controller.signal.aborted) setError("No se pudo actualizar el resumen. Los últimos datos permanecen visibles; recarga para volver a comprobarlos."); }
    }
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  const cards = [
    ...(canProfiles ? [{ title: "Anuncios por aprobar", count: data.pendingProfiles, href: "/admin/anuncios-publicaciones?estado=pending", detail: "Nuevos anuncios y cambios que requieren reaprobación" }] : []),
    ...(canMedia ? [{ title: "Fotos y videos por revisar", count: data.pendingMedia, href: "/admin/medios?estado=pending&tipo=public", detail: "Archivos públicos, agrupados por anuncio" }, { title: "Contenido exclusivo pendiente", count: data.pendingExclusive, href: "/admin/medios?estado=pending&tipo=exclusive", detail: "Revisión separada del material privado" }] : []),
  ];
  return <section className="admin-moderation-inbox" aria-label="Bandeja de moderación">
    <header><div><p>PRIORIDADES DEL EQUIPO</p><h2>Por revisar</h2><span>Marcar una notificación como leída no aprueba ni elimina ningún pendiente.</span></div>{canAudit && <Link href="/admin/actividad?notify_state=unread#notificaciones">{data.unread} avisos nuevos →</Link>}</header>
    <div className="admin-moderation-counts">{cards.map(card => <Link key={card.title} href={card.href} className={card.count ? "has-pending" : ""}><strong>{card.count}</strong><div><b>{card.title}</b><span>{card.detail}</span></div><span aria-hidden="true">→</span></Link>)}</div>
    <div className="admin-moderation-queue">{data.items.length ? data.items.map(item => <article key={item.id}><div><strong>{item.name}</strong><span>{item.city} · {item.status === "pending" ? "Anuncio pendiente" : "Medios pendientes"}{item.files ? ` · ${item.files} archivo${item.files === 1 ? "" : "s"}` : ""}</span>{item.unread > 0 && <small>{item.unread} novedad{item.unread === 1 ? "" : "es"} sin leer</small>}</div><nav>{canProfiles && <Link href={`/admin/anuncios-publicaciones/${encodeURIComponent(item.id)}/editar`}>Revisar anuncio</Link>}{canMedia && item.files > 0 && <Link href={`/admin/medios?perfil=${encodeURIComponent(item.id)}&estado=pending`}>Revisar {item.files} archivos</Link>}</nav></article>) : <p>No hay anuncios ni archivos públicos pendientes. Las notificaciones leídas se conservan en el historial.</p>}</div>
    {error && <p role="status">{error}</p>}<footer><small>Actualización automática cada minuto mientras esta página está visible.</small>{canAudit && <Link href="/admin/actividad#notificaciones">Abrir historial de notificaciones →</Link>}</footer>
  </section>;
}
