export const ADMIN_SESSION_COOKIE = "chile3x_admin_session";
export const USER_SESSION_COOKIE = "chile3x_user_session";
// A host-only, HttpOnly random coordination key, never an authentication token.
export const BROWSER_SESSION_COOKIE = "__Host-chile3x_browser";
export type SessionMode = "admin" | "account";

export function browserSessionKey(cookieHeader: string | null) {
  const values = (cookieHeader ?? "").split(";").map(part => part.trim()).flatMap(part => {
    const separator = part.indexOf("=");
    return separator >= 0 && part.slice(0, separator) === BROWSER_SESSION_COOKIE ? [part.slice(separator + 1)] : [];
  });
  return values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0]) ? values[0] : null;
}

/** Bootstrap before credentials/registration side effects, not in an auth POST. */
export function needsBrowserSessionKey(pathname: string) {
  return ["/ingresar", "/registro", "/reactivar-cuenta", "/admin", "/mi-cuenta"].some(path => pathname === path || pathname.startsWith(path + "/"))
    || ["/api/auth/login", "/api/auth/register", "/api/auth/google", "/api/auth/reactivate", "/api/auth/github/start", "/api/auth/github/callback", "/api/auth/apple/start", "/api/auth/apple/finish", "/api/auth/x/start", "/api/auth/x/callback", "/api/mi-cuenta/accesos"].includes(pathname);
}

export function parseSessionToken(value: string | null | undefined) {
  if (!value || value.length > 400) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]{1,100}$/.test(parts[0]) || !/^[A-Za-z0-9_-]{1,256}$/.test(parts[1])) return null;
  return { id: parts[0], secret: parts[1] };
}

/** Never choose one credential when two identities (or duplicate cookies) are presented. */
export function browserSessionState(cookieHeader: string | null) {
  const entries = (cookieHeader ?? "").split(";").map(part => part.trim()).flatMap(part => {
    const separator = part.indexOf("=");
    const name = part.slice(0, separator);
    return separator >= 0 && [ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE].includes(name)
      ? [{ name, value: part.slice(separator + 1) }] : [];
  });
  const admin = entries.filter(entry => entry.name === ADMIN_SESSION_COOKIE);
  const account = entries.filter(entry => entry.name === USER_SESSION_COOKIE);
  const conflict = admin.length > 1 || account.length > 1 || (admin.some(entry => entry.value) && account.some(entry => entry.value));
  return { conflict, entries, mode: conflict ? null : admin[0]?.value ? "admin" as const : account[0]?.value ? "account" as const : null };
}

export function sessionMatchesMode(mode: SessionMode, role: string, method: string) {
  return mode === "admin" ? role === "admin" && method === "github"
    : ["visitor", "advertiser", "tester"].includes(role) && ["password", "google", "apple", "x", "reactivation", "unknown"].includes(method);
}
