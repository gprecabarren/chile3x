import Link from "next/link";
import { adminAuditLogs } from "@/db/schema";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { adminAuditDate, adminAuditInstant } from "@/lib/admin-audit-date";

export function RecentAdminActivity({ entries }: { entries: (typeof adminAuditLogs.$inferSelect)[] }) {
  return <section className="admin-recent-activity" aria-labelledby="recent-admin-heading">
    <header><div><p className="eyebrow">HISTORIAL ADMINISTRATIVO</p><h2 id="recent-admin-heading">Últimos 10 movimientos</h2></div><Link prefetch={false} className="text-link" href="/admin/actividad#eventos-administrativos">Ver historial completo →</Link></header>
    {entries.length ? <ol>{entries.map(entry => <li key={entry.id}>
      <div><strong>{ADMIN_AUDIT_ACTIONS[entry.action as keyof typeof ADMIN_AUDIT_ACTIONS] ?? entry.action}</strong><p>{entry.summary}</p><span>{entry.actorName ?? entry.actorEmail}{entry.actorGithubLogin ? ` · @${entry.actorGithubLogin}` : ""}</span><small>{entry.actorEmail}</small></div>
      <div><time dateTime={adminAuditInstant(entry.createdAt)}>{adminAuditDate(entry.createdAt)}</time><span className={`admin-audit-outcome is-${entry.outcome}`}>{entry.outcome === "success" ? "Completado" : "Fallido"}</span><Link prefetch={false} href={`/admin/actividad?q=${encodeURIComponent(entry.entityId ?? entry.actorEmail)}#eventos-administrativos`}>Ver detalle</Link></div>
    </li>)}</ol> : <p>Aún no hay movimientos administrativos registrados.</p>}
  </section>;
}
