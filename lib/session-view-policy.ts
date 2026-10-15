import type { SessionMode } from "./session-policy";

export type SessionView = { mode: SessionMode | null; identity: string | null };
export function isProtectedSessionPath(pathname: string) {
  return /^\/(?:admin|mi-cuenta|foro)(?:\/|$)/.test(pathname);
}
export function parseSessionView(value: unknown): SessionView | null {
  if (!value || typeof value !== "object") return null;
  const view = value as Record<string, unknown>;
  if (view.mode === null && view.identity === null) return { mode: null, identity: null };
  if ((view.mode === "admin" || view.mode === "account") && typeof view.identity === "string" && /^[a-f0-9]{64}$/.test(view.identity)) return { mode: view.mode, identity: view.identity };
  return null;
}
export function sessionViewsMatch(expected: SessionView, actual: SessionView) {
  return expected.mode === actual.mode && expected.identity === actual.identity;
}
