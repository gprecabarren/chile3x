export function navigationIsActive(pathname: string, href: string, hash = "") {
  const [path, anchor] = href.split("#");
  if (anchor) return pathname === (path || "/") && hash === `#${anchor}`;
  return pathname === path || (path !== "/" && pathname.startsWith(`${path}/`));
}
