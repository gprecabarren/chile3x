"use client";

import { useEffect, useState } from "react";

export function ConversationUnreadBadge({ conversationId, initialCount }: { conversationId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  useEffect(() => {
    const read = (event: Event) => {
      if ((event as CustomEvent<{ conversationId?: string }>).detail?.conversationId === conversationId) setCount(0);
    };
    window.addEventListener("chile3x:messages-read", read);
    return () => window.removeEventListener("chile3x:messages-read", read);
  }, [conversationId]);
  return count > 0 ? <b aria-label={`${count} mensajes sin leer`}>{count}</b> : null;
}
