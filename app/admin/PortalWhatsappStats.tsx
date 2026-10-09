import { gte, sql, sum } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { portalWhatsappEvents } from "@/db/schema";
import { chileanDay } from "@/lib/chile-day";

const placementLabels: Record<string, string> = {
  floating: "Panel flotante", header: "Header", footer: "Footer", contact: "Contacto", about: "Quiénes somos", registration: "Registro",
};
const number = new Intl.NumberFormat("es-CL");
const getStats = cache(async () => {
  const from = chileanDay(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  return (await getDb()).select({
    contactId: portalWhatsappEvents.contactId, label: sql<string>`max(${portalWhatsappEvents.contactLabel})`,
    placement: portalWhatsappEvents.placement, action: portalWhatsappEvents.action, total: sum(portalWhatsappEvents.hits),
  }).from(portalWhatsappEvents).where(gte(portalWhatsappEvents.recordedOn, from))
    .groupBy(portalWhatsappEvents.contactId, portalWhatsappEvents.placement, portalWhatsappEvents.action);
});

export async function PortalWhatsappStats() {
  const rows = await getStats();
  const openings = rows.filter(row => row.action === "panel_open").reduce((total, row) => total + Number(row.total), 0);
  const clicks = rows.filter(row => row.action === "contact_click");
  const floating = clicks.filter(row => row.placement === "floating").reduce((total, row) => total + Number(row.total), 0);
  const direct = clicks.filter(row => row.placement !== "floating").reduce((total, row) => total + Number(row.total), 0);
  return <section className="portal-whatsapp-stats" aria-label="Estadísticas de WhatsApp del equipo de Chile3X">
    <header><div><p>EQUIPO CHILE3X</p><h2>WhatsApp del sitio</h2></div><span>Últimos 30 días · hora de Chile</span></header>
    <p>Estos contadores son del soporte y marketing del portal, no de los anuncios. Abrir el panel no cuenta como contacto. Los clics indican intención de abrir WhatsApp, no mensajes enviados ni conversaciones iniciadas.</p>
    <div className="portal-whatsapp-stat-totals"><div><span>Aperturas del panel</span><strong>{number.format(openings)}</strong></div><div><span>Clics desde el panel</span><strong>{number.format(floating)}</strong></div><div><span>Clics directos a soporte</span><strong>{number.format(direct)}</strong></div></div>
    {clicks.length ? <div className="portal-whatsapp-stat-table"><table><caption>Clics por área y acceso</caption><thead><tr><th scope="col">Área</th><th scope="col">Acceso</th><th scope="col">Clics</th></tr></thead><tbody>{clicks.sort((a, b) => Number(b.total) - Number(a.total)).map(row => <tr key={`${row.contactId}:${row.placement}`}><th scope="row">{row.label}</th><td>{placementLabels[row.placement] ?? row.placement}</td><td>{number.format(Number(row.total))}</td></tr>)}</tbody></table></div> : <p className="portal-whatsapp-stats-empty">Aún no hay clics registrados en los WhatsApp del equipo.</p>}
    <small>Conteos internos anónimos agregados por día, área y acceso. No identifican visitantes ni guardan IP, cuenta, teléfono o ubicación. No equivalen a personas únicas. La medición opcional de Google solo se activa con consentimiento y puede mostrar cifras distintas.</small>
  </section>;
}
