/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import type { ForwardableEmailMessage } from "@cloudflare/workers-types";
import handler from "vinext/server/app-router-entry";
import { hasPrivateSession, isCacheableDocument, preventPrivateCaching, publicCacheKey, PUBLIC_PAGE_CACHE_SECONDS } from "./public-cache";
import type { TelegramQueueMessage } from "../lib/telegram";
import { handleTelegramQueue, handleTelegramScheduled, handleTelegramWebhook, isTelegramWebhookPath } from "./telegram";
import { cityDirectory } from "../app/locations";
import { enforceEmailVerification, handleEmailVerificationScheduled } from "./email-verification";
import { limitMultipartUpload } from "./upload-limits";
import { purgeExpiredStoryRecords } from "./story-cleanup";
import { enforceExclusiveBrowserSession } from "./session-isolation";
import { handleDataRetentionScheduled, purgeMediaDeletionJobs } from "./data-retention";
import { forwardConfiguredInbound, handleModerationMailScheduled } from "./moderation-mail";
import { prepareSitePresentation } from "./site-presentation";
import { HOME_LAYOUT_HEADER } from "../lib/home-layout-policy";
import { VISUAL_THEME_HEADER } from "../lib/site-theme-policy";
import { adminMutationResponse } from "./admin-mutation-response";
import { isSamplePath,PRIVATE_SAMPLE_HEADER,PRIVATE_SAMPLES_ENABLED } from "../lib/private-sample-policy";

const availableCitySlugs = new Set(cityDirectory.map(city => city.citySlug));

function withSecurityHeaders(response: Response, pathname = "", privateDocument = false) {
  const headers = new Headers(response.headers);
  const faceBlurPage = pathname === "/admin/medios"
    || /^\/admin\/cuentas\/[^/]+\/perfiles\/[^/]+\/medios$/.test(pathname)
    || /^\/mi-cuenta\/[^/]+\/editar$/.test(pathname)
    || privateDocument;
  // SPA navigation retains the original document's CSP. A signed-in visitor
  // may open Home first and then the media editor without a full page reload.
  // Permit only WASM compilation on session documents; JavaScript eval stays blocked.
  const wasmPermission = faceBlurPage ? " 'wasm-unsafe-eval'" : "";
  headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  // Keep this compatible with Google Identity popups while isolating the
  // top-level page from unrelated cross-origin windows.
  headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  headers.set("referrer-policy", pathname === "/api/auth/verificar-correo" ? "no-referrer" : "strict-origin-when-cross-origin");
  if(isSamplePath(pathname)) {
    headers.set("cache-control","private, no-store, max-age=0");
    headers.set("x-robots-tag","noindex, nofollow, noarchive, nosnippet, noimageindex");
    headers.set("referrer-policy","no-referrer");
  }
  // Private administration and beta routes, including anonymous redirects,
  // must not be indexed or cached. This does not replace authentication.
  if (pathname === "/admin" || pathname.startsWith("/admin/")
    || pathname === "/foro" || pathname.startsWith("/foro/")) {
    headers.set("cache-control", "private, no-store, max-age=0");
    headers.set("x-robots-tag", "noindex, nofollow, nosnippet");
  }
  headers.set("permissions-policy", "camera=(self), geolocation=(self), microphone=(self)");
  headers.set("content-security-policy", `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'${wasmPermission} https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com https://news.google.com https://cdn.jsdelivr.net https://static.cloudflareinsights.com; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob:; font-src 'self' data:; frame-src https://accounts.google.com https://challenges.cloudflare.com https://www.googletagmanager.com https://news.google.com https://maps.google.com https://www.google.com; connect-src 'self' https://accounts.google.com https://www.googleapis.com https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://region1.google-analytics.com https://news.google.com https://cdn.jsdelivr.net https://storage.googleapis.com https://cloudflareinsights.com; upgrade-insecure-requests`);
  if(isSamplePath(pathname))headers.set("content-security-policy","default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; frame-src https://maps.google.com https://www.google.com; connect-src 'self'");
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
    || path.endsWith(".map")
    || path.startsWith("/@fs/")
    || path.startsWith("/@vite/")
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
    if(!PRIVATE_SAMPLES_ENABLED&&(isSamplePath(url.pathname)||/^\/(?:admin|api\/admin)\/muestras(?:\/|$)/.test(url.pathname))) {
      return withSecurityHeaders(new Response("No disponible.",{status:404,headers:{"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow, nosnippet"}}),url.pathname,true);
    }
    const privateSample=isSamplePath(url.pathname),requestHeaders=new Headers(request.headers);
    requestHeaders.delete(PRIVATE_SAMPLE_HEADER);
    if(privateSample)requestHeaders.set(PRIVATE_SAMPLE_HEADER,"1");
    request=new Request(request,{headers:requestHeaders});

    if (isTelegramWebhookPath(url.pathname)) {
      return withSecurityHeaders(await handleTelegramWebhook(request, env));
    }

    if (isLegacyApplicationProbe(url.pathname)) {
      return probeNotFoundResponse();
    }

    const sessionConflict = privateSample?null:await enforceExclusiveBrowserSession(request, env.DB);
    if (sessionConflict) return withSecurityHeaders(sessionConflict, url.pathname, true);
    const verificationBlock = privateSample?null:await enforceEmailVerification(request, env.DB);
    if (verificationBlock) return withSecurityHeaders(verificationBlock, url.pathname, true);

    const uploadRequest = await limitMultipartUpload(request);
    if (uploadRequest instanceof Response) return withSecurityHeaders(uploadRequest, url.pathname, true);
    request = uploadRequest;

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

    const home = await prepareSitePresentation(request, env.DB);
    request = home.request;
    const cacheKey = publicCacheKey(request, `${env.CF_VERSION_METADATA?.id??"current"}:${home.contentRevision}`, availableCitySlugs, home.layout, home.theme);
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

    const response = withSecurityHeaders(adminMutationResponse(request,await handler.fetch(request, env, ctx)), url.pathname, hasPrivateSession(request));
    if (url.pathname === "/") response.headers.set(HOME_LAYOUT_HEADER, home.layout);
    if (home.page) response.headers.set(VISUAL_THEME_HEADER, home.theme);
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
    await handleModerationMailScheduled(env).catch(() => console.error("Moderation mail processing failed; next cycle will inspect pending jobs."));
    await Promise.all([handleTelegramScheduled(env), handleEmailVerificationScheduled(env), handleDataRetentionScheduled(env), purgeMediaDeletionJobs(env).catch(()=>console.error("La limpieza de archivos se reintentará en el siguiente ciclo.")), purgeExpiredStoryRecords(env).then(result => {
      if (result.retryNeeded) console.warn("Story cleanup needs retry", { removed: result.removed });
    }).catch(() => { console.error("Scheduled story cleanup failed; will retry on the next cron."); })]);
  },
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    await forwardConfiguredInbound(message, env);
  },
};

export default worker satisfies ExportedHandler<Env, TelegramQueueMessage>;
