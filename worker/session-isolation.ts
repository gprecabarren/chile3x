import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, browserSessionState, parseSessionToken } from "../lib/session-policy";
import { sha256 } from "../lib/auth";

export async function enforceExclusiveBrowserSession(request: Request, db: D1Database): Promise<Response | null> {
  const state = browserSessionState(request.headers.get("cookie"));
  if (!state.conflict) return null;
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
