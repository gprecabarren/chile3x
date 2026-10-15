import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, browserSessionKey, needsBrowserSessionKey, browserSessionState, parseSessionToken } from "../lib/session-policy";
import { sha256 } from "../lib/auth";

function prepareBrowserSession(request: Request): Response | null {
  const url = new URL(request.url);
  if (!needsBrowserSessionKey(url.pathname) || browserSessionKey(request.headers.get("cookie"))) return null;
  // Ordinary pages (including RSC navigation) mount the shared setup boundary.
  if (request.method === "GET" && !url.pathname.startsWith("/api/")) return null;
  const headers = new Headers({ "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" });
  const message = "Necesitas permitir las cookies necesarias para iniciar sesión. Vuelve a abrir la página de acceso e inténtalo nuevamente.";
  if (request.method === "GET") {
    headers.set("content-type", "text/html; charset=utf-8");
    // Direct OAuth entry has no React document yet. Use exactly the same lock
    // protocol, never issue a competing key from concurrent GET responses.
    return new Response(`<!doctype html><html lang="es"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acceso seguro | Chile3X</title><style>body{margin:0;background:#0a0f1a;color:#f4f7fc;font:16px/1.7 system-ui}main{max-width:560px;margin:12vh auto;padding:28px}section{padding:28px;border:1px solid #46536c;border-radius:14px;background:#141c2c}h1{font-size:32px;line-height:1.2}a{color:#ff929f}</style><body><main><section role="status"><p>CHILE3X · ACCESO SEGURO</p><h1>Preparando acceso seguro</h1><p id="browser-setup-message">Estamos preparando este navegador para mantener una sola identidad activa.</p><noscript>Activa JavaScript y permite las cookies necesarias para continuar.</noscript><a href="">Reintentar</a></section></main><script type="module">import{ensureBrowserSession}from'/assets/browser-session-bootstrap-v1.js';const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{await ensureBrowserSession(controller.signal);location.reload()}catch(error){document.querySelector('#browser-setup-message').textContent=error.name==='AbortError'?'Revisa tu conexión y vuelve a intentarlo.':error.message}finally{clearTimeout(timer)}</script></body></html>`, { headers });
  }
  if (request.headers.get("accept")?.includes("application/json") || !/application\/x-www-form-urlencoded|multipart\/form-data/i.test(request.headers.get("content-type") ?? "")) {
    return Response.json({ error: "browser_session_required", message, signInUrl: "/ingresar?error=browser_session_required" }, { status: 409, headers });
  }
  headers.set("location", new URL("/ingresar?error=browser_session_required", request.url).toString());
  return new Response(null, { status: 303, headers });
}

export async function enforceExclusiveBrowserSession(request: Request, db: D1Database): Promise<Response | null> {
  const state = browserSessionState(request.headers.get("cookie"));
  if (!state.conflict) return prepareBrowserSession(request);
  // Fail closed before the renderer, upload parsing or administrative actions.
  // Hash verification prevents an arbitrary cookie ID from revoking another device.
  const tokens = state.entries.slice(0, 8).map(entry => parseSessionToken(entry.value)).filter(token => token !== null);
  if (tokens.length) await db.batch(await Promise.all(tokens.map(async token => db.prepare("DELETE FROM auth_sessions WHERE id = ? AND token_hash = ?").bind(token.id, await sha256(token.secret)))));
  const headers = new Headers({ "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" });
  for (const name of [ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE]) headers.append("set-cookie", `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  const message = "Se detectaron dos sesiones distintas en este navegador. Se cerraron por seguridad. Ingresa nuevamente con una sola identidad.";
  if (new URL(request.url).pathname.startsWith("/api/") && (request.headers.get("accept")?.includes("application/json") || !/application\/x-www-form-urlencoded|multipart\/form-data/i.test(request.headers.get("content-type") ?? ""))) {
    return Response.json({ error: "session_conflict", message, signInUrl: "/ingresar?error=session_conflict" }, { status: 409, headers });
  }
  headers.set("location", new URL("/ingresar?error=session_conflict", request.url).toString());
  return new Response(null, { status: 303, headers });
}
