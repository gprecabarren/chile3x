/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  MEDIA: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function withSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(self), geolocation=(self), microphone=(self)");
  headers.set("content-security-policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://news.google.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob:; font-src 'self' data:; frame-src https://challenges.cloudflare.com https://www.googletagmanager.com https://news.google.com; connect-src 'self' https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://news.google.com https://cdn.jsdelivr.net https://storage.googleapis.com; upgrade-insecure-requests");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const PUBLIC_PAGE_CACHE_SECONDS = 120;

function hasAuthenticatedSession(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return /(?:^|;\s*)chile3x_(?:user|admin)_session=/.test(cookieHeader);
}

/**
 * Public directory views have no visitor-specific server state unless the
 * visitor has signed in. Cache only those anonymous HTML responses for a very
 * short time, which dramatically reduces repeated SSR work from browsers and
 * crawlers while keeping new moderation changes visible promptly.
 */
function isCacheablePublicPage(request: Request, url: URL) {
  if (request.method !== "GET" || hasAuthenticatedSession(request)) return false;
  // Client navigation requests use the same public data through a `.rsc`
  // endpoint. Cache it under its own URL, never together with HTML.
  const path = url.pathname.endsWith(".rsc") ? url.pathname.slice(0, -4) || "/" : url.pathname;
  if (path === "/" || path === "/escorts" || path === "/agencias" || path === "/arriendos") return true;
  if (path.startsWith("/escorts/") || path.startsWith("/perfil/") || path.startsWith("/noticias/")) return true;
  return ["/quienes-somos", "/noticias", "/faq", "/contacto", "/terminos", "/privacidad", "/reglas-de-publicacion"].includes(path);
}

function cacheableResponse(response: Response) {
  return response.status === 200
    && /text\/(?:html|x-component)/i.test(response.headers.get("content-type") ?? "")
    && !response.headers.has("set-cookie");
}

function addPublicCacheHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", `public, max-age=0, s-maxage=${PUBLIC_PAGE_CACHE_SECONDS}, stale-while-revalidate=300`);
  headers.set("x-chile3x-cache", "public");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Chile3X does not run PHP or WordPress. Automated scanners frequently probe
 * hundreds of those legacy paths in a burst; without this early return each
 * probe reaches the application renderer and can exhaust the Free CPU limit.
 * Answer with a generic 404 so no implementation detail is disclosed.
 */
function isLegacyApplicationProbe(pathname: string) {
  const path = pathname.toLowerCase();
  return path.endsWith(".php")
    || path === "/wp"
    || path.startsWith("/wp/")
    || path.includes("/wp-")
    || path.includes("/.git")
    || path.includes("/.env")
    || path.includes("/vendor/phpunit")
    || path.includes("/cgi-bin/");
}

function probeNotFoundResponse() {
  return withSecurityHeaders(new Response("Not found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400, s-maxage=86400",
      "x-robots-tag": "noindex, nofollow",
    },
  }));
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (isLegacyApplicationProbe(url.pathname)) {
      return probeNotFoundResponse();
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return withSecurityHeaders(await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths));
    }

    const shouldUsePublicCache = isCacheablePublicPage(request, url);
    const cache = shouldUsePublicCache ? caches.default : null;
    const cacheKey = shouldUsePublicCache ? new Request(url.toString(), { method: "GET" }) : null;

    if (cache && cacheKey) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set("x-chile3x-cache", "hit");
        return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers });
      }
    }

    const response = withSecurityHeaders(await handler.fetch(request, env, ctx));
    if (!cache || !cacheKey || !cacheableResponse(response)) return response;

    const cacheResponse = addPublicCacheHeaders(response);
    ctx.waitUntil(cache.put(cacheKey, cacheResponse.clone()));
    return cacheResponse;
  },
};

export default worker;
