import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMessagePage, listMessageConversations } from "@/lib/internal-messages";
import { AccountHeading, AccountShell } from "../_components";
import { ChatThread } from "./ChatThread";

export const dynamic = "force-dynamic";

function profileHref(profile: { profileHandle: string | null; profileSlug: string | null }) {
  if (!profile.profileSlug && !profile.profileHandle) return null;
  return `/perfil/${profile.profileHandle ? `@${profile.profileHandle}` : profile.profileSlug}`;
}

function compactDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", timeZone: "America/Santiago" }).format(new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`));
}

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ conversacion?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/mensajes");
  const [conversations, params] = await Promise.all([listMessageConversations(user.id), searchParams]);
  const selected = conversations.find((item) => item.id === params.conversacion) ?? conversations[0] ?? null;
  const page = selected ? await getMessagePage(selected.id, user.id) : null;

  return <AccountShell user={user}><div className="account-content account-messages-page">
    <AccountHeading eyebrow="MENSAJERÍA PRIVADA" title="Mensajes" description="Conversaciones privadas iniciadas desde cada anuncio. Puedes reconocer el perfil de origen, silenciar avisos o bloquear el contacto sin perder el historial." backHref="/mi-cuenta" />
    <div className="internal-chat-layout">
      <aside className="internal-chat-inbox" aria-label="Conversaciones">
        <header><h2>Conversaciones</h2><span>{conversations.length}</span></header>
        {conversations.length === 0 && <p>Cuando escribas desde un anuncio o recibas una consulta, la conversación aparecerá aquí.</p>}
        {conversations.map((conversation) => <Link className={selected?.id === conversation.id ? "is-active" : ""} href={`/mi-cuenta/mensajes?conversacion=${encodeURIComponent(conversation.id)}`} key={conversation.id}>
          <span className="internal-chat-avatar">{conversation.profileImageId ? <Image src={`/media/${conversation.profileImageId}`} alt="" fill unoptimized sizes="52px" /> : conversation.otherUserActive ? conversation.profileName.slice(0, 1) : "C3X"}</span>
          <span className="internal-chat-inbox-copy"><strong>{conversation.profileName}</strong><small>{conversation.otherUserLabel}</small><em>{conversation.lastMessageBody ?? "Conversación iniciada"}</em></span>
          <span className="internal-chat-inbox-meta"><time dateTime={conversation.lastMessageAt}>{compactDate(conversation.lastMessageAt)}</time>{Number(conversation.unreadCount) > 0 && <b>{Number(conversation.unreadCount)}</b>}{conversation.isMuted && <i title="Conversación silenciada">Silenciada</i>}</span>
        </Link>)}
      </aside>
      {selected && page ? <div className="internal-chat-main"><div className="internal-chat-profile-link"><span>{selected.otherUserActive ? "Este chat corresponde al anuncio" : "La otra cuenta fue deshabilitada o eliminada"}</span>{profileHref(selected) ? <Link href={profileHref(selected)!} target="_blank">Ver {selected.profileName}</Link> : <strong>Usuario de Chile3X</strong>}</div><ChatThread conversationId={selected.id} currentRole={selected.currentRole} profileName={selected.profileName} counterpartLabel={selected.otherUserLabel} counterpartAvailable={Boolean(selected.otherUserActive && selected.profileId)} initialMessages={page.messages} initialHasMore={page.hasMore} initialMuted={Boolean(selected.isMuted)} initialBlockedByMe={Boolean(selected.blockedByMe)} initialBlockedByAnyone={Boolean(selected.blockedByAnyone)} /></div> : <section className="account-empty internal-chat-welcome"><h2>Tu bandeja está vacía</h2><p>Abre un anuncio público y usa el botón «Chat interno». Solo las cuentas con sesión iniciada pueden enviar mensajes.</p><Link className="button button-primary" href="/escorts">Explorar anuncios</Link></section>}
    </div>
  </div></AccountShell>;
}
