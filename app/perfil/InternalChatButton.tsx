"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InternalChatButton({ profileId, signedIn, loginHref }: { profileId: string; signedIn: boolean; loginHref: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openChat() {
    if (!signedIn) {
      router.push(loginHref);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/mensajes/conversaciones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const result = await response.json().catch(() => null) as { href?: string } | null;
      if (!response.ok || !result?.href) throw new Error("No fue posible abrir el chat.");
      router.push(result.href);
    } catch {
      setError("No pudimos abrir el chat interno. Inténtalo nuevamente.");
      setBusy(false);
    }
  }

  return <div className="internal-chat-launcher">
    <button className="button contact-internal-chat" type="button" onClick={openChat} disabled={busy}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h16v11H8l-4 4v-15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      <span>{busy ? "Abriendo…" : "Chat interno"}</span>
    </button>
    {error && <small role="alert">{error}</small>}
  </div>;
}

