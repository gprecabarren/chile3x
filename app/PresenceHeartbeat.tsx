"use client";

import { useEffect, useRef } from "react";

const HEARTBEAT_INTERVAL = 45_000;
const ACTIVE_WINDOW = 90_000;

export function PresenceHeartbeat() {
  const lastInteraction = useRef(0);
  const lastSent = useRef(0);

  useEffect(() => {
    lastInteraction.current = Date.now();
    function send() {
      const now = Date.now();
      if (document.visibilityState !== "visible" || now - lastInteraction.current > ACTIVE_WINDOW || now - lastSent.current < HEARTBEAT_INTERVAL) return;
      lastSent.current = now;
      void fetch("/api/presencia", { method: "POST", keepalive: true });
    }
    function activity() {
      lastInteraction.current = Date.now();
      send();
    }
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "focus"];
    for (const event of events) window.addEventListener(event, activity, { passive: true });
    document.addEventListener("visibilitychange", activity);
    send();
    const timer = window.setInterval(send, HEARTBEAT_INTERVAL);
    return () => {
      window.clearInterval(timer);
      for (const event of events) window.removeEventListener(event, activity);
      document.removeEventListener("visibilitychange", activity);
    };
  }, []);

  return null;
}
