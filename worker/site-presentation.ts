import { HOME_LAYOUT_HEADER, readHomeLayout } from "../lib/home-layout-policy.ts";
import { previewVisualTheme, readVisualTheme, VISUAL_THEME_HEADER } from "../lib/site-theme-policy.ts";

/** One bounded settings read pins the shared cache and server HTML to the
 * same presentation. Caller-supplied headers never select a theme or layout. */
export async function prepareSitePresentation(request: Request, database?: D1Database) {
  const headers = new Headers(request.headers);
  headers.delete(HOME_LAYOUT_HEADER);
  headers.delete(VISUAL_THEME_HEADER);
  const path = new URL(request.url).pathname;
  const page = ["GET", "HEAD"].includes(request.method)
    && !/^\/(?:api(?:\/|$)|assets(?:\/|$)|fonts(?:\/|$)|_vinext(?:\/|$)|_next(?:\/|$)|media(?:\/|$)|contenido(?:\/|$)|historias(?:\/|$)|patrocinadores\/media(?:\/|$)|noticias\/media(?:\/|$))/.test(path)
    && !/^\/(?:robots\.txt|sitemap\.xml|site\.webmanifest|favicon\.ico|chile3x-[^/]+\.(?:png|ico))$/.test(path);
  let rows: Array<{ key: string; value: string }> = [];
  if (page && database) {
    try {
      const result = await database.prepare("SELECT key, value FROM site_settings WHERE key IN (?, ?) UNION ALL SELECT 'content_revision' AS key, CAST(revision AS TEXT) AS value FROM settings_revision WHERE id='site' LIMIT 3")
        .bind("home_layout", "visual_theme").all<{ key: string; value: string }>();
      rows = result.results;
    } catch {
      console.warn("Presentation settings could not be read; using the default appearance.");
    }
  }
  const layout = readHomeLayout(rows.find(row => row.key === "home_layout")?.value);
  const theme = previewVisualTheme(path) ?? readVisualTheme(rows.find(row => row.key === "visual_theme")?.value);
  if (page) headers.set(VISUAL_THEME_HEADER, theme);
  if (page && path === "/") headers.set(HOME_LAYOUT_HEADER, layout);
  const contentRevision=rows.find(row=>row.key==="content_revision")?.value??"0";
  return { request: new Request(request, { headers }), layout, theme, page, contentRevision };
}
