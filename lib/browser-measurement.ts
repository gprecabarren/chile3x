/** Display-only optimization. Every internal counter independently excludes
 * administrative traffic on the server, without trusting this DOM marker. */
export function isAdministrativeBrowser() {
  return typeof document !== "undefined" && document.querySelector('.browser-session-boundary[data-session-mode="admin"]') !== null;
}
