// Shared by the React shell and direct OAuth navigation. No identifiers or
// credentials are exposed to JavaScript/storage. The lock spans cookie receipt.
export const BROWSER_SETUP_LOCK = "chile3x:browser-session-setup:v1";

/**
 * @param {AbortSignal} signal
 * @param {LockManager | undefined} locks
 * @param {typeof fetch} fetcher
 */
export async function ensureBrowserSession(signal, locks = globalThis.navigator?.locks, fetcher = globalThis.fetch) {
  if (!locks) throw new Error("Este navegador no permite preparar un acceso seguro entre pestañas. Actualízalo e inténtalo nuevamente.");
  await locks.request(BROWSER_SETUP_LOCK, { signal }, async () => {
    for (const phase of ["prepare", "confirm"]) {
      const response = await fetcher("/api/auth/session/browser", {
        method: "POST", credentials: "same-origin", cache: "no-store", signal,
        headers: { "x-chile3x-browser-check": phase },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "No pudimos preparar este navegador. Revisa tu conexión y las cookies necesarias.");
      if (payload.ready === true) return;
      if (phase === "confirm") break;
    }
    throw new Error("No se pudieron confirmar las cookies necesarias. Permítelas y vuelve a intentarlo.");
  });
}
