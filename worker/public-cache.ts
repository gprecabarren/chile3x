const CACHE_VERSION = "anonymous-documents-v2";
export const PUBLIC_PAGE_CACHE_SECONDS = 600;

export function hasPrivateSession(request: Request) {
  return request.headers.has("authorization")
    || /(?:^|;\s*)chile3x_(?:user|admin)_session=/.test(request.headers.get("cookie") ?? "");
}

/** Only full anonymous documents are shareable. Router payloads depend on
 * navigation headers, not just their URL, and must not overwrite HTML entries. */
export function publicCacheKey(request: Request): Request | null {
  if (request.method !== "GET" || hasPrivateSession(request)) return null;
  const url = new URL(request.url);
  if (url.pathname.endsWith(".rsc") || request.headers.has("rsc")
    || request.headers.get("accept")?.includes("text/x-component")) return null;
  for (const name of request.headers.keys()) {
    if (name.startsWith("next-") || name.startsWith("x-vinext-")) return null;
  }
  const path = url.pathname;
  const allowed = ["/", "/escorts", "/agencias", "/arriendos", "/quienes-somos", "/noticias", "/faq", "/contacto", "/terminos", "/privacidad", "/reglas-de-publicacion"].includes(path)
    || path.startsWith("/escorts/") || path.startsWith("/perfil/") || path.startsWith("/noticias/");
  if (!allowed) return null;
  // Never reuse entries created before authenticated home caching was removed.
  url.searchParams.set("__chile3x_cache", CACHE_VERSION);
  return new Request(url.toString(), { method: "GET" });
}

export function isCacheableDocument(response: Response) {
  return response.status === 200
    && /^text\/html\b/i.test(response.headers.get("content-type") ?? "")
    && !response.headers.has("set-cookie")
    && response.headers.get("vary")?.trim() !== "*";
}

export function preventPrivateCaching(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "private, no-store, max-age=0");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
