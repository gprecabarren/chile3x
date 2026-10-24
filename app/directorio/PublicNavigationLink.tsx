"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ComponentProps } from "react";
import Link from "@/app/NavigationLink";
import { navigationIsActive } from "@/lib/navigation-active";
import { createAnchorNavigationHighlight } from "@/lib/anchor-navigation-highlight";

let anchorHighlight: ReturnType<typeof createAnchorNavigationHighlight> | undefined;
const getStore = () => anchorHighlight ??= createAnchorNavigationHighlight(window);
const subscribe = (changed: () => void) => getStore().subscribe(changed);
const getSnapshot = () => getStore().getSnapshot();
const emptySnapshot = () => "";
const noSubscription = () => () => {};

export function PublicNavigationLink({ className, onClick, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const isAnchor = typeof props.href === "string" && props.href.includes("#");
  const selection = useSyncExternalStore(isAnchor ? subscribe : noSubscription, isAnchor ? getSnapshot : emptySnapshot, emptySnapshot);
  const hash = selection.startsWith(`${pathname}#`) ? selection.slice(pathname.length) : "";
  const active = typeof props.href === "string" && navigationIsActive(pathname, props.href, hash);
  return <Link {...props} className={[className, active ? "is-current" : ""].filter(Boolean).join(" ")} aria-current={active ? isAnchor ? "location" : "page" : undefined} onClick={event => {
    onClick?.(event);
    if (!isAnchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || props.download || (props.target && props.target !== "_self")) return;
    const target = new URL(event.currentTarget.href);
    if (target.origin === window.location.origin) getStore().activate(target.pathname + target.hash);
  }} />;
}
