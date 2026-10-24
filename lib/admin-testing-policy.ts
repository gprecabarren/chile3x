export const TESTING_PATH = "/admin/testing";
export const HOME_TESTING_PATH = "/admin/testing?seccion=inicio";
export const THEME_TESTING_PATH = "/admin/testing?seccion=tema";
export const BUG_REPORT_STATES = ["new", "reviewing", "waiting_tester", "in_progress", "resolved", "closed"] as const;

export function testingBugReportsPath(state?: unknown, updated = false) {
  const query = new URLSearchParams({ seccion: "bugs" });
  if (typeof state === "string" && BUG_REPORT_STATES.some(value => value === state)) query.set("estado", state);
  if (updated) query.set("notice", "updated");
  return `${TESTING_PATH}?${query}`;
}

export function readTestingSection(value: unknown, permissions: { bugs: boolean; settings: boolean }) {
  if (value === "tema") return permissions.settings ? "tema" : null;
  if (value === "inicio") return permissions.settings ? "inicio" : null;
  if (value === "bugs") return permissions.bugs ? "bugs" : null;
  return permissions.bugs ? "bugs" : permissions.settings ? "inicio" : null;
}

export function settingsReturnPath(value: unknown) {
  if(value==="/admin/contenido/seo"||value==="/admin/contenido/inicio"||value==="/admin/contenido/faq")return value;
  if (value === HOME_TESTING_PATH || value === THEME_TESTING_PATH) return value;
  return typeof value === "string" && /^\/admin\/configuracion(?:\/[a-z-]+)?$/.test(value) ? value : "/admin/configuracion";
}

export function legacyTestingPath(query: URLSearchParams) {
  if (query.get("seccion") === "inicio" || query.get("seccion") === "tema") {
    const target = query.get("seccion") === "tema" ? THEME_TESTING_PATH : HOME_TESTING_PATH;
    return target + (query.get("saved") === "1" ? "&saved=1" : "");
  }
  return testingBugReportsPath(query.get("estado"), query.get("notice") === "updated");
}
