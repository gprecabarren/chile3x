import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMessagePage, listMessageConversations } from "@/lib/internal-messages";
import { AccountHeading, AccountShell } from "../_components";
import { ChatThread } from "./ChatThread";
import { ConversationUnreadBadge } from "./ConversationUnreadBadge";

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
        {conversations.map((conversation) => <div className={`internal-chat-inbox-row ${selected?.id === conversation.id ? "is-active" : ""}`} key={conversation.id}>
          {profileHref(conversation) ? <Link className="internal-chat-avatar" href={profileHref(conversation)!} aria-label={`Ver anuncio de ${conversation.profileName}`} prefetch={false}>{conversation.profileImageId ? <Image src={`/media/${conversation.profileImageId}`} alt="" fill unoptimized sizes="52px" /> : conversation.profileName.slice(0, 1)}</Link> : <span className="internal-chat-avatar">C3X</span>}
          <Link className="internal-chat-inbox-copy" href={`/mi-cuenta/mensajes?conversacion=${encodeURIComponent(conversation.id)}`}><strong>{conversation.profileName}</strong><small>{conversation.currentRole === "visitor" ? "Anunciante" : conversation.otherUserLabel}</small><em>{conversation.lastMessageBody ?? "Conversación iniciada"}</em></Link>
          <span className="internal-chat-inbox-meta"><time dateTime={conversation.lastMessageAt}>{compactDate(conversation.lastMessageAt)}</time><ConversationUnreadBadge key={`${conversation.id}:${conversation.lastMessageAt}:${conversation.unreadCount}`} conversationId={conversation.id} initialCount={Number(conversation.unreadCount)} />{Boolean(conversation.isMuted) && <i title="Conversación silenciada">Silenciada</i>}</span>
        </div>)}
      </aside>
      {selected && page ? <div className="internal-chat-main"><div className="internal-chat-profile-link"><span>{selected.otherUserActive ? "Este chat corresponde al anuncio" : "La otra cuenta fue deshabilitada o eliminada"}</span>{profileHref(selected) ? <Link href={profileHref(selected)!}>Ver {selected.profileName}</Link> : <strong>Usuario de Chile3X</strong>}</div><ChatThread key={selected.id} conversationId={selected.id} currentRole={selected.currentRole} profileName={selected.profileName} counterpartLabel={selected.otherUserLabel} currentUserLabel={user.displayName?.trim() || (user.username ? `@${user.username}` : "Usuario de Chile3X")} counterpartAvailable={Boolean(selected.otherUserActive && selected.profileId)} initialMessages={page.messages} initialHasMore={page.hasMore} initialMuted={Boolean(selected.isMuted)} initialBlockedByMe={Boolean(selected.blockedByMe)} initialBlockedByAnyone={Boolean(selected.blockedByAnyone)} /></div> : <section className="account-empty internal-chat-welcome"><h2>Tu bandeja está vacía</h2><p>Abre un anuncio público y usa el botón «Chat interno». Solo las cuentas con sesión iniciada pueden enviar mensajes.</p><Link className="button button-primary" href="/escorts">Explorar anuncios</Link></section>}
    </div>
  </div></AccountShell>;
}
