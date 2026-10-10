"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ComponentProps } from "react";
import Link from "@/app/NavigationLink";
import { navigationIsActive } from "@/lib/navigation-active";

const subscribe = (changed: () => void) => { window.addEventListener("hashchange", changed); window.addEventListener("popstate", changed); return () => { window.removeEventListener("hashchange", changed); window.removeEventListener("popstate", changed); }; };
const getHash = () => window.location.hash;
export function PublicNavigationLink({ className, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const hash = useSyncExternalStore(subscribe, getHash, () => "");
  const active = typeof props.href === "string" && navigationIsActive(pathname, props.href, hash);
  return <Link {...props} className={[className, active ? "is-current" : ""].filter(Boolean).join(" ")} aria-current={active ? "page" : undefined} />;
}
