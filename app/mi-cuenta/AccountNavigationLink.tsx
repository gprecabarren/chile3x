"use client";

import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import Link from "@/app/NavigationLink";

export function AccountNavigationLink({ grouped = false, ...props }: ComponentProps<typeof Link> & { grouped?: boolean }) {
  const pathname = usePathname();
  const href = String(props.href).split("#")[0];
  const active = grouped
    ? pathname === "/mi-cuenta/favoritos" || pathname === "/mi-cuenta/comentarios"
    : pathname === href || (href !== "/mi-cuenta" && pathname.startsWith(`${href}/`));
  return <Link {...props} aria-current={active ? "page" : undefined} />;
}
