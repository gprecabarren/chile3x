function localReturnTo(value: string | null, fallback: string, allowed: (path: string) => boolean) {
  if (!value?.startsWith("/") || value.startsWith("//") || /[\\\r\n\t]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://chile3x.invalid");
    if (url.origin !== "https://chile3x.invalid" || !allowed(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function safeAdminReturnTo(value: string | null) {
  return localReturnTo(value, "/admin", (path) => path === "/admin" || path.startsWith("/admin/"));
}

export function safeAccountReturnTo(value: string | null) {
  return localReturnTo(value, "/mi-cuenta", (path) => path === "/mi-cuenta"
    || path.startsWith("/mi-cuenta/") || path.startsWith("/perfil/")
    || path === "/escorts" || path.startsWith("/escorts/") || path === "/agencias" || path === "/arriendos");
}
