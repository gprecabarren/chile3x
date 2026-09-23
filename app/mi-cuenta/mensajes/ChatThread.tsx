"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { MessageRecord } from "@/lib/internal-messages";

const errorMessages: Record<string, string> = {
  blocked: "La conversación está bloqueada.",
  unavailable: "El anuncio ya no está disponible para recibir mensajes nuevos.",
  rate_limited: "Enviaste varios mensajes seguidos. Espera un momento antes de continuar.",
  empty: "Escribe un mensaje antes de enviarlo.",
};

function messageTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`));
}

function containsSensitiveInformation(value: string) {
  return /\b(?:\d[ .-]?){8,16}\b|contrase(?:ña|na)|clave|c[oó]digo\s+(?:de\s+)?(?:acceso|verificaci[oó]n)|tarjeta|cuenta\s+bancaria|rut\b/i.test(value);
}

export function ChatThread({
  conversationId,
  currentRole,
  profileName,
  counterpartLabel,
  counterpartAvailable,
  initialMessages,
  initialHasMore,
  initialMuted,
  initialBlockedByMe,
  initialBlockedByAnyone,
}: {
  conversationId: string;
  currentRole: "visitor" | "owner";
  profileName: string;
  counterpartLabel: string;
  counterpartAvailable: boolean;
  initialMessages: MessageRecord[];
  initialHasMore: boolean;
  initialMuted: boolean;
  initialBlockedByMe: boolean;
  initialBlockedByAnyone: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [body, setBody] = useState("");
  const [muted, setMuted] = useState(initialMuted);
  const [blockedByMe, setBlockedByMe] = useState(initialBlockedByMe);
  const [blockedByAnyone, setBlockedByAnyone] = useState(initialBlockedByAnyone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const knownIds = useRef(new Set(initialMessages.map((message) => message.id)));
  const listRef = useRef<HTMLDivElement>(null);

  const preference = useCallback(async (action: "mute" | "unmute" | "block" | "unblock" | "read") => {
    const response = await fetch(`/api/mensajes/${encodeURIComponent(conversationId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!response.ok) throw new Error("No se pudo actualizar la conversación.");
  }, [conversationId]);

  useEffect(() => {
    void preference("read");
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [preference]);

  useEffect(() => {
    const poll = async () => {
      const response = await fetch(`/api/mensajes/${encodeURIComponent(conversationId)}`, { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json() as { messages: MessageRecord[]; hasMore: boolean };
      const incoming = result.messages.filter((item) => item.senderRole !== currentRole && !knownIds.current.has(item.id));
      for (const item of result.messages) knownIds.current.add(item.id);
      setMessages((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        for (const item of result.messages) byId.set(item.id, item);
        return [...byId.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
      });
      if (incoming.length) {
        void preference("read");
        if (!muted && "Notification" in window && Notification.permission === "granted") {
          new Notification(`Nuevo mensaje sobre ${profileName}`, { body: incoming.at(-1)?.body.slice(0, 120), tag: conversationId });
        }
      }
    };
    const timer = window.setInterval(() => void poll(), 12_000);
    return () => window.clearInterval(timer);
  }, [conversationId, currentRole, muted, preference, profileName]);

  async function loadOlder() {
    const oldest = messages[0]?.createdAt;
    if (!oldest || busy) return;
    setBusy(true);
    const response = await fetch(`/api/mensajes/${encodeURIComponent(conversationId)}?before=${encodeURIComponent(oldest)}`, { cache: "no-store" });
    const result = await response.json().catch(() => null) as { messages?: MessageRecord[]; hasMore?: boolean } | null;
    if (response.ok && result?.messages) {
      for (const message of result.messages) knownIds.current.add(message.id);
      setMessages((current) => [...result.messages!, ...current]);
      setHasMore(Boolean(result.hasMore));
    }
    setBusy(false);
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!body.trim() || busy || blockedByAnyone) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/mensajes/${encodeURIComponent(conversationId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const result = await response.json().catch(() => null) as { message?: MessageRecord; error?: string } | null;
    if (!response.ok || !result?.message) {
      setError(errorMessages[result?.error ?? ""] ?? "No se pudo enviar el mensaje.");
      if (result?.error === "blocked") setBlockedByAnyone(true);
    } else {
      setMessages((current) => [...current, result.message!]);
      knownIds.current.add(result.message.id);
      setBody("");
      window.setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 0);
    }
    setBusy(false);
  }

  async function toggleMute() {
    setBusy(true);
    try {
      await preference(muted ? "unmute" : "mute");
      setMuted(!muted);
    } catch { setError("No se pudo cambiar el silencio de esta conversación."); }
    setBusy(false);
  }

  async function toggleBlock() {
    setBusy(true);
    try {
      await preference(blockedByMe ? "unblock" : "block");
      setBlockedByMe(!blockedByMe);
      setBlockedByAnyone(blockedByMe ? initialBlockedByAnyone && !initialBlockedByMe : true);
    } catch { setError("No se pudo cambiar el bloqueo de esta conversación."); }
    setBusy(false);
  }

  async function enableBrowserNotifications() {
    if (!("Notification" in window)) return setError("Este navegador no permite avisos de escritorio.");
    const permission = await Notification.requestPermission();
    setError(permission === "granted" ? "Los avisos del navegador quedaron habilitados mientras Chile3X esté abierto." : "El navegador no autorizó los avisos.");
  }

  const sensitiveWarning = containsSensitiveInformation(body);
  return <section className="internal-chat-thread" aria-label={`Conversación sobre ${profileName}`}>
    <header>
      <div><span>CONVERSACIÓN PRIVADA</span><h2>{counterpartAvailable ? profileName : counterpartLabel}</h2></div>
      <div className="internal-chat-controls">
        <button type="button" onClick={enableBrowserNotifications}>Activar avisos</button>
        <button type="button" onClick={toggleMute} disabled={busy}>{muted ? "Reactivar avisos" : "Silenciar"}</button>
        <button className={blockedByMe ? "is-blocked" : ""} type="button" onClick={toggleBlock} disabled={busy}>{blockedByMe ? "Desbloquear" : "Bloquear"}</button>
      </div>
    </header>
    <p className="internal-chat-safety"><strong>Cuida tu privacidad:</strong> no envíes contraseñas, códigos, documentos, datos bancarios ni información que no quieras compartir. Chile3X nunca te pedirá esos datos por este chat.</p>
    <div className="internal-chat-messages" ref={listRef} aria-live="polite">
      {hasMore && <button className="internal-chat-load-more" type="button" onClick={loadOlder} disabled={busy}>Cargar mensajes anteriores</button>}
      {messages.length === 0 && <p className="internal-chat-empty">Aún no hay mensajes. Preséntate y menciona que viste este anuncio en Chile3X.</p>}
      {messages.map((message) => <article className={message.senderRole === currentRole ? "is-own" : "is-other"} key={message.id}>
        <p>{message.body}</p><time dateTime={message.createdAt}>{messageTime(message.createdAt)}</time>
      </article>)}
    </div>
    {!counterpartAvailable && <p className="internal-chat-blocked" role="status">Esta cuenta fue deshabilitada o eliminada. Su identidad se ocultó y el historial permanece visible, pero ya no admite mensajes nuevos.</p>}
    {counterpartAvailable && blockedByAnyone && <p className="internal-chat-blocked" role="status">La conversación está bloqueada y no admite mensajes nuevos. El historial permanece visible.</p>}
    <form className="internal-chat-composer" onSubmit={send}>
      <label htmlFor="internal-chat-body">Mensaje</label>
      <textarea id="internal-chat-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={1_200} rows={4} disabled={blockedByAnyone || !counterpartAvailable} placeholder="Escribe un mensaje privado…" />
      <div><small className={sensitiveWarning ? "is-warning" : ""}>{sensitiveWarning ? "Parece que incluiste información sensible. Revísala antes de enviar." : `${body.length}/1200 caracteres`}</small><button className="button button-primary" type="submit" disabled={busy || blockedByAnyone || !counterpartAvailable || !body.trim()}>{busy ? "Enviando…" : "Enviar mensaje"}</button></div>
    </form>
    {error && <p className="form-alert" role="status">{error}</p>}
  </section>;
}
