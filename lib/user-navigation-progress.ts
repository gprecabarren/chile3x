export const USER_NAVIGATION_START = "chile3x:user-navigation-start";

export function navigationProgressTarget(href: string, currentHref: string) {
  try {
    const current = new URL(currentHref);
    const target = new URL(href, current);
    if (target.origin !== current.origin || !/^https?:$/.test(target.protocol)) return null;
    if (/^\/(?:admin|foro|api|media|contenido)(?:\/|$)/.test(target.pathname)) return null;
    const search = target.searchParams.toString();
    const currentSearch = current.searchParams.toString();
    const path = `${target.pathname}${search ? `?${search}` : ""}`;
    return path === `${current.pathname}${currentSearch ? `?${currentSearch}` : ""}` ? null : path;
  } catch { return null; }
}

/** Feedback only: no network interception, retry, authentication or form replay. */
export function beginUserNavigation(href: string) {
  if (typeof window === "undefined") return;
  const target = navigationProgressTarget(href, window.location.href);
  if (target) window.dispatchEvent(new CustomEvent(USER_NAVIGATION_START, { detail: target }));
}
