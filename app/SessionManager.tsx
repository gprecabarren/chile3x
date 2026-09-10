import type { ReactNode } from "react";

type SessionView = Awaited<ReturnType<typeof import("@/lib/session-management").getAccountSessions>>[number];

function SessionCard({ session, action, currentLogoutAction }: {
  session: SessionView;
  action: string;
  currentLogoutAction: string;
}) {
  return <article className={`session-card${session.isCurrent ? " is-current" : ""}`}>
    <header>
      <div><span>{session.device}</span><h3>{session.deviceLabel}</h3></div>
      {session.isCurrent && <strong>Esta sesión</strong>}
    </header>
    <dl>
      <div><dt>Dirección IP</dt><dd className="session-ip">{session.ipAddress ?? "Disponible al volver a ingresar"}</dd></div>
      <div><dt>Ubicación aproximada</dt><dd>{session.location}</dd></div>
      <div><dt>Inicio de sesión</dt><dd>{session.createdLabel}</dd></div>
      <div><dt>Última actividad</dt><dd>{session.lastSeenLabel}</dd></div>
      <div><dt>Método</dt><dd>{session.authMethodLabel}</dd></div>
      <div><dt>Vence</dt><dd>{session.expiresLabel}</dd></div>
    </dl>
    {session.isCurrent
      ? <form action={currentLogoutAction} method="post"><button className="button button-outline" type="submit">Cerrar esta sesión</button></form>
      : <form action={action} method="post"><input type="hidden" name="action" value="revoke_one" /><input type="hidden" name="session_id" value={session.id} /><button className="button button-outline" type="submit">Cerrar esta sesión</button></form>}
  </article>;
}

export function SessionManager({ sessions, action, currentLogoutAction, eyebrow, title, description, notice }: {
  sessions: SessionView[];
  action: string;
  currentLogoutAction: string;
  eyebrow: string;
  title: string;
  description: string;
  notice?: ReactNode;
}) {
  const current = sessions.find((session) => session.isCurrent);
  const primary = current ?? sessions[0];
  const others = sessions.filter((session) => session.id !== primary?.id);
  return <section className="session-manager" id="sesiones" aria-labelledby="session-manager-title">
    <div className="session-manager-heading">
      <div><p className="eyebrow">{eyebrow}</p><h2 id="session-manager-title">{title}</h2><p>{description}</p></div>
      <span>{sessions.length} activa{sessions.length === 1 ? "" : "s"}</span>
    </div>
    {notice}
    {primary && <SessionCard session={primary} action={action} currentLogoutAction={currentLogoutAction} />}
    {others.length > 0 && <details className="session-other-details">
      <summary>Ver otros dispositivos ({others.length})</summary>
      <div className="session-list">{others.map((session) => <SessionCard key={session.id} session={session} action={action} currentLogoutAction={currentLogoutAction} />)}</div>
    </details>}
    {others.length > 0 && <form className="session-revoke-others" action={action} method="post"><input type="hidden" name="action" value="revoke_others" /><button className="button button-outline" type="submit">Cerrar todas las demás sesiones</button></form>}
    <p className="session-privacy-note">La ubicación se estima por la IP de conexión y puede no ser exacta. Chile3X no guarda GPS ni la ubicación precisa del dispositivo.</p>
  </section>;
}
