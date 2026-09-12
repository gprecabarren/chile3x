import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { telegramAccountLinks, telegramMemberships } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getTelegramConfiguration, telegramIdentityLabel } from "@/lib/telegram";
import { latestTelegramLinkAttempt } from "@/lib/telegram-linking";
import { AccountHeading, AccountShell } from "../_components";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  linked: "La identidad quedó vinculada. La invitación privada llegará al chat con el bot.",
  invite_sent: "Enviamos una invitación nueva al chat con el bot. Vence en 10 minutos.",
  unlinked: "El vínculo fue retirado y el acceso a Miembros quedó revocado.",
  confirmation_error: "No pudimos confirmar la identidad. El enlace puede haber vencido o no coincide con tu sesión.",
  invite_error: "No pudimos generar la invitación. Revisa que el vínculo siga activo o inténtalo nuevamente.",
  unlink_confirmation: "Escribe DESVINCULAR para confirmar.",
  unlink_error: "No existe un vínculo activo para retirar.",
  not_configured: "El bot todavía no está disponible. Vuelve a intentarlo cuando la comunidad esté activa.",
};

export default async function AccountTelegramPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "admin") redirect("/ingresar?return_to=/mi-cuenta/telegram");
  const db = await getDb();
  const [query, configuration, attempt, linkRows] = await Promise.all([
    searchParams,
    getTelegramConfiguration(),
    latestTelegramLinkAttempt(user.id, "account"),
    db.select({
      id: telegramAccountLinks.id,
      telegramUserId: telegramAccountLinks.telegramUserId,
      username: telegramAccountLinks.username,
      firstName: telegramAccountLinks.firstName,
      status: telegramAccountLinks.status,
      revokedAt: telegramAccountLinks.revokedAt,
      revokeReason: telegramAccountLinks.revokeReason,
    }).from(telegramAccountLinks).where(eq(telegramAccountLinks.userId, user.id)).limit(1),
  ]);
  const link = linkRows[0] ?? null;
  const [membership] = link ? await db.select({ status: telegramMemberships.status, joinedAt: telegramMemberships.joinedAt }).from(telegramMemberships).where(and(
    eq(telegramMemberships.userId, user.id),
    eq(telegramMemberships.telegramUserId, link.telegramUserId),
  )).limit(1) : [];
  const candidateReady = attempt?.status === "candidate";

  return <AccountShell user={user}><div className="account-content telegram-account-page">
    <AccountHeading eyebrow="COMUNIDAD CHILE3X" title="Telegram y acceso a Miembros" description="Vincula una identidad de Telegram desde esta sesión. El bot nunca te pedirá contraseñas, códigos, documentos ni datos bancarios." />
    {query.notice && notices[query.notice] && <p className={query.notice.includes("error") || query.notice.includes("confirmation") || query.notice === "not_configured" ? "account-error" : "account-success"} role="status">{notices[query.notice]}</p>}
    {configuration.publicCommunityUrl && <section className="telegram-community-callout">
      <div><p className="eyebrow">ACCESO PÚBLICO</p><h2>Comunidad Chile3X</h2><p>Puedes entrar a la comunidad pública sin vincular tu cuenta. El espacio de Miembros se habilita solo después de validar el vínculo.</p></div>
      <a className="button button-outline" href={configuration.publicCommunityUrl} target="_blank" rel="noreferrer">Abrir comunidad pública</a>
    </section>}

    <ol className="telegram-user-flow" aria-label="Pasos para acceder a Miembros">
      <li><span>1</span><div><strong>Inicia el vínculo</strong><p>Presiona el botón de esta página mientras mantienes tu sesión Chile3X abierta.</p></div></li>
      <li><span>2</span><div><strong>Habla con el bot</strong><p>Telegram abrirá @Chile3XBot con una clave temporal y segura.</p></div></li>
      <li><span>3</span><div><strong>Confirma y entra</strong><p>Regresa al sitio, confirma la identidad y recibe la invitación privada en el bot.</p></div></li>
    </ol>

    <section className="telegram-link-card">
      <header><div><p className="eyebrow">IDENTIDAD VINCULADA</p><h2>{link ? telegramIdentityLabel(link.firstName, link.username, link.telegramUserId) : "Aún no vinculada"}</h2></div><span className={`telegram-status is-${link?.status ?? "unlinked"}`}>{link?.status === "linked" ? "Vinculada" : link?.status === "banned" ? "Vetada" : "Sin acceso"}</span></header>
      {!link || link.status === "revoked" ? <>
        <p>El proceso parte aquí, continúa en el bot y termina con una confirmación en esta misma sesión web. Así otra persona no puede apropiarse del enlace.</p>
        <form action="/api/mi-cuenta/telegram/vincular" method="post"><button className="button button-primary" type="submit">Vincular Telegram</button></form>
      </> : link.status === "banned" ? <p>Esta identidad fue vetada de los espacios de Telegram. La cuenta del sitio se mantiene separada; solicita una revisión desde <Link href="/contacto">Contacto</Link>.</p> : <>
        <dl><div><dt>Estado de Miembros</dt><dd>{membership?.status === "active" ? "Dentro del espacio privado" : membership?.status === "pending" ? "Solicitud o invitación pendiente" : "Fuera del espacio privado"}</dd></div><div><dt>Reingreso</dt><dd>Siempre es manual; una reactivación del sitio no te añade automáticamente.</dd></div></dl>
        <div className="telegram-account-actions"><form action="/api/mi-cuenta/telegram/invitacion" method="post"><button className="button button-primary" type="submit">{membership?.status === "active" ? "Enviar otra invitación" : "Volver a entrar"}</button></form><details><summary>Desvincular Telegram</summary><form action="/api/mi-cuenta/telegram/desvincular" method="post"><p>Se revocará el acceso a Miembros. Para confirmar, escribe DESVINCULAR.</p><label>Confirmación<input name="confirmation" autoComplete="off" required /></label><button className="button button-danger" type="submit">Desvincular y revocar acceso</button></form></details></div>
      </>}
    </section>

    {candidateReady && <section className="telegram-confirm-card">
      <p className="eyebrow">CONFIRMACIÓN FINAL</p>
      <h2>¿Reconoces esta identidad?</h2>
      <strong>{telegramIdentityLabel(attempt.candidateFirstName, attempt.candidateUsername, attempt.candidateTelegramUserId)}</strong>
      <p>Confirma solo si acabas de hablar con el bot desde esa cuenta de Telegram.</p>
      <form action="/api/mi-cuenta/telegram/confirmar" method="post"><button className="button button-primary" type="submit">Sí, vincular esta identidad</button></form>
    </section>}

    <section className="telegram-safety-note"><h2>Reglas básicas de seguridad</h2><p>Chile3X no coordina pagos, reservas ni negociaciones por el bot o los grupos. No compartas contraseñas, códigos de verificación, documentos, datos bancarios ni material privado de terceros.</p></section>
  </div></AccountShell>;
}
