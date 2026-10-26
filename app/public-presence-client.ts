"use client";

type Listener = (online: boolean) => void;
const listeners = new Map<string, Set<Listener>>();
const REFRESH_MS = 45_000, BATCH_SIZE = 60;
let timer: ReturnType<typeof setInterval> | undefined, pending: ReturnType<typeof setTimeout> | undefined;
let flight: AbortController | null = null, changed = false;

function schedule() {
  if (pending !== undefined) return;
  pending = setTimeout(() => { pending = undefined; void refresh(); }, 0);
}
function emit(ids: string[], online: Set<string>) {
  for (const id of ids) for (const listener of listeners.get(id) ?? []) listener(online.has(id));
}
async function refresh() {
  if (document.visibilityState !== "visible" || !listeners.size) return;
  if (flight) { changed = true; return; }
  const controller = new AbortController(), ids = [...listeners.keys()];
  flight = controller; changed = false;
  try {
    for (let start = 0; start < ids.length; start += BATCH_SIZE) {
      const batch = ids.slice(start, start + BATCH_SIZE), query = new URLSearchParams(batch.map(id => ["id", id]));
      const response = await fetch(`/api/presencia?${query}`, { cache: "no-store", credentials: "omit", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.onlineProfileIds) || result.onlineProfileIds.some((id: unknown) => typeof id !== "string" || !batch.includes(id))) throw new Error("Presencia no confirmada.");
      if (flight === controller) emit(batch, new Set(result.onlineProfileIds));
    }
  } catch {
    // A cached online badge is not evidence of current activity when the live
    // check fails. Hide it until a later successful read confirms presence.
    if (flight === controller && !controller.signal.aborted) emit(ids, new Set());
  } finally {
    if (flight === controller) { flight = null; if (changed) schedule(); }
  }
}
function visibility() {
  if (document.visibilityState === "visible") schedule();
  else flight?.abort();
}
/** This singleton starts only from browser effects. Subscribing badges share
 * one timer and batches; server rendering never stores request identities. */
export function subscribePublicPresence(id: string, listener: Listener) {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  let group = listeners.get(id);
  if (!group) { group = new Set(); listeners.set(id, group); }
  group.add(listener); changed = true;
  if (timer === undefined) {
    document.addEventListener("visibilitychange", visibility);
    timer = setInterval(() => void refresh(), REFRESH_MS);
  }
  schedule();
  return () => {
    group.delete(listener);
    if (!group.size) listeners.delete(id);
    if (listeners.size) return;
    if (timer !== undefined) clearInterval(timer);
    if (pending !== undefined) clearTimeout(pending);
    timer = undefined; pending = undefined;
    flight?.abort(); flight = null; changed = false;
    document.removeEventListener("visibilitychange", visibility);
  };
}
