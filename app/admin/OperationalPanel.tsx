import Link from "next/link";
import {
  formatBytes,
  OPERATIONAL_CATEGORIES,
  operationalDate,
  type OperationalFilters,
} from "@/lib/operations";

type Dashboard = Awaited<ReturnType<typeof import("@/lib/operations").getOperationalDashboard>>;

const eventLabels: Record<string, string> = {
  "portal.email": "Envío de correo",
  "account.registration": "Registro de cuenta",
  "google.sign_in": "Inicio con Google",
  "admin.audit": "Registro administrativo",
  "storage.audit": "Auditoría D1/R2",
};

function storageStatus(status: string | undefined) {
  if (status === "complete") return "Completo";
  if (status === "partial") return "Parcial";
  if (status === "failure") return "Fallido";
  return "Sin revisión";
}

export function OperationalPanel({ dashboard, filters, notice }: {
  dashboard: Dashboard;
  filters: OperationalFilters;
  notice?: string;
}) {
  const storage = dashboard.storage;
  const hasFilters = filters.period !== "24h" || filters.category !== "all" || filters.outcome !== "all";
  return <section className="operational-panel" id="panel-operativo" aria-labelledby="operational-title">
    <div className="operational-heading">
      <div><p className="eyebrow">SALUD DEL PORTAL</p><h2 id="operational-title">Panel operativo</h2><p>Errores internos, entregas de correo y estado del almacenamiento. Las métricas no contienen contraseñas, tokens, destinatarios ni claves privadas.</p></div>
      <span className={`operational-health${dashboard.failureCount > 0 ? " has-warning" : ""}`}>{dashboard.failureCount > 0 ? "Requiere atención" : "Sin alertas registradas"}</span>
    </div>
    {notice === "storage_refreshed" && <p className="admin-success" role="status">La revisión de D1 y R2 fue actualizada.</p>}
    {notice === "storage_error" && <p className="form-alert" role="alert">No fue posible completar la revisión de almacenamiento. El intento quedó registrado.</p>}
    <div className="operational-metrics" aria-label="Indicadores operativos">
      <article><span>Errores · {filters.period === "all" ? "histórico" : filters.period}</span><strong>{dashboard.failureCount}</strong><small>Fallas operativas registradas.</small></article>
      <article><span>Correos fallidos</span><strong>{dashboard.emailFailureCount}</strong><small>Entregas que agotaron las alternativas.</small></article>
      <article><span>Respuesta interna</span><strong>{dashboard.averageDurationMs ? `${dashboard.averageDurationMs} ms` : "Sin datos"}</strong><small>Promedio de las operaciones con medición disponible.</small></article>
      <article><span>Uso D1</span><strong>{formatBytes(storage?.d1UsedBytes)}</strong><small>{storage ? `${formatBytes(storage.d1AllocatedBytes)} asignados` : "Ejecuta una revisión"}.</small></article>
      <article><span>Uso R2</span><strong>{formatBytes(storage?.r2Bytes)}</strong><small>{storage?.r2ObjectCount ?? 0} archivos encontrados.</small></article>
      <article className={storage?.orphanObjectCount ? "has-warning" : undefined}><span>Archivos huérfanos</span><strong>{storage?.orphanObjectCount ?? "—"}</strong><small>{storage ? `${formatBytes(storage.orphanBytes)} sin referencia · ${storageStatus(storage.status)}` : "Aún no se ha revisado R2"}.</small></article>
    </div>
    <div className="operational-storage-actions">
      <div>{storage ? <p>Última revisión: <strong>{operationalDate(storage.createdAt)}</strong> · {storage.referencedObjectCount ?? 0} referencias D1 · {storage.missingObjectCount ?? "—"} archivos faltantes.</p> : <p>La revisión compara las referencias de D1 con los objetos reales de R2 y no elimina ningún archivo.</p>}</div>
      <form action="/api/admin/operaciones/almacenamiento" method="post"><button className="button button-outline" type="submit">Actualizar revisión D1/R2</button></form>
    </div>
    <details className="operational-details" open={hasFilters || notice === "storage_error"}>
      <summary>Ver más: filtros y eventos ({dashboard.eventCount})</summary>
      <form className="operational-filters" method="get" action="/admin#panel-operativo">
        <label>Período<select name="ops_period" defaultValue={filters.period}><option value="24h">Últimas 24 horas</option><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="all">Todo el historial</option></select></label>
        <label>Área<select name="ops_category" defaultValue={filters.category}><option value="all">Todas</option>{Object.entries(OPERATIONAL_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Resultado<select name="ops_status" defaultValue={filters.outcome}><option value="all">Todos</option><option value="failure">Fallidos</option><option value="success">Completados</option></select></label>
        <div><button className="button button-primary" type="submit">Aplicar filtros</button>{hasFilters && <Link className="button button-outline" href="/admin#panel-operativo" prefetch={false}>Limpiar</Link>}</div>
      </form>
      {dashboard.events.length ? <div className="operational-event-list" aria-label="Eventos operativos">{dashboard.events.map((event) => <article key={event.id}>
        <span className={`operational-event-status is-${event.outcome}`} aria-hidden="true" />
        <div><strong>{eventLabels[event.eventName] ?? event.eventName}</strong><small>{OPERATIONAL_CATEGORIES[event.category]} · {operationalDate(event.createdAt)}{event.durationMs !== null ? ` · ${event.durationMs} ms` : ""}</small>{event.detail && <p>{event.detail}</p>}</div>
        <b className={`is-${event.outcome}`}>{event.outcome === "success" ? "Completado" : "Fallido"}</b>
      </article>)}</div> : <div className="operational-empty"><strong>No hay eventos para estos filtros</strong><p>Los eventos comenzarán a aparecer a medida que el portal procese correos, accesos y revisiones.</p></div>}
      {dashboard.eventCount > dashboard.events.length && <p className="operational-limit-note">Se muestran los 20 eventos más recientes de {dashboard.eventCount} coincidencias. Acota el período o el área para investigar.</p>}
    </details>
  </section>;
}
