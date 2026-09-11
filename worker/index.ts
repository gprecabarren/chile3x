/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { hasPrivateSession, isCacheableDocument, preventPrivateCaching, publicCacheKey, PUBLIC_PAGE_CACHE_SECONDS } from "./public-cache";
import type { TelegramQueueMessage } from "../lib/telegram";
import { handleTelegramQueue, handleTelegramScheduled, handleTelegramWebhook, isTelegramWebhookPath } from "./telegram";

function withSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(self), geolocation=(self), microphone=(self)");
  headers.set("content-security-policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com https://news.google.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob:; font-src 'self' data:; frame-src https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com https://news.google.com; connect-src 'self' https://accounts.google.com https://www.googleapis.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://news.google.com https://cdn.jsdelivr.net https://storage.googleapis.com https://cloudflareinsights.com; upgrade-insecure-requests");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function addPublicCacheHeaders(response: Response) {
  const headers = new Headers(response.headers);
  // Internal edge entry only; browsers must re-request after login/logout.
  headers.set("cache-control", `public, max-age=${PUBLIC_PAGE_CACHE_SECONDS}`);
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

    if (isTelegramWebhookPath(url.pathname)) {
      return withSecurityHeaders(await handleTelegramWebhook(request, env));
    }

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

    const cacheKey = publicCacheKey(request);
    const cache = cacheKey ? (caches as CacheStorage & { default: Cache }).default : null;

    if (cache && cacheKey) {
      // A transient cache failure must not take down the application.
      const cached = await cache.match(cacheKey).catch(() => undefined);
      if (cached) {
        const headers = new Headers(cached.headers);
        headers.set("x-chile3x-cache", "hit");
        return preventPrivateCaching(new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers }));
      }
    }

    const response = withSecurityHeaders(await handler.fetch(request, env, ctx));
    if (!cache || !cacheKey || !isCacheableDocument(response)) {
      const isDocument = /text\/(?:html|x-component)/i.test(response.headers.get("content-type") ?? "");
      return hasPrivateSession(request) || isDocument || url.pathname.startsWith("/api/auth/")
        ? preventPrivateCaching(response) : response;
    }

    const cacheResponse = addPublicCacheHeaders(response);
    ctx.waitUntil(cache.put(cacheKey, cacheResponse.clone()).catch(() => {
      console.warn("Public document cache write failed");
    }));
    return preventPrivateCaching(cacheResponse);
  },
  async queue(batch: MessageBatch<TelegramQueueMessage>, env: Env): Promise<void> {
    await handleTelegramQueue(batch, env);
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await handleTelegramScheduled(env);
  },
} satisfies ExportedHandler<Env, TelegramQueueMessage>;

export default worker;
