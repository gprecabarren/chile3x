"use client";

import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import Link from "@/app/NavigationLink";

// El mismo trazo y tamaño que los iconos del menú administrativo.
const paths: Record<string, string> = {
  "/mi-cuenta": "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  "/mi-cuenta#mis-anuncios": "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5",
  "/mi-cuenta/mensajes": "M4 4h16v12H9l-5 4zM8 8h8M8 12h5",
  "/mi-cuenta/contenido": "M3 4h18v16H3zM3 16l5-5 4 4 4-6 5 7M7 8h.01",
  "/mi-cuenta/datos-personales": "M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 21v-3a7 7 0 0 1 14 0v3",
  "/mi-cuenta/favoritos": "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z",
  "/mi-cuenta/reportes": "M5 21V3M5 4h14l-2 4 2 4H5",
  "/mi-cuenta/telegram": "M3 11l18-7-4 17-6-5-4 3v-6zM7 13l10-6",
  "/mi-cuenta/pruebas": "M7 8h10v10a5 5 0 0 1-10 0zM9 8V6a3 3 0 0 1 6 0v2M3 12h4M17 12h4M3 17h4M17 17h4",
  "/mi-cuenta/bloqueados": "M12 2l8 3v6c0 5-4 8-8 11-4-3-8-6-8-11V5zM9 9l6 6M15 9l-6 6",
  "/mi-cuenta/ayuda": "M9 8a3 3 0 1 1 4 3c-1 1-1 1-1 3M12 18h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
};

export function AccountNavigationLink({ grouped = false, ...props }: ComponentProps<typeof Link> & { grouped?: boolean }) {
  const pathname = usePathname();
  const fullHref = String(props.href);
  const href = fullHref.split("#")[0];
  const active = grouped
    ? pathname === "/mi-cuenta/favoritos" || pathname === "/mi-cuenta/comentarios"
    : !fullHref.includes("#") && (pathname === href || (href !== "/mi-cuenta" && pathname.startsWith(`${href}/`)));
  return <Link {...props} className={`${props.className ?? ""}${active ? " is-current" : ""}`} aria-current={active ? "page" : undefined}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[fullHref] ?? paths[href] ?? paths["/mi-cuenta"]} /></svg>
    <span>{props.children}</span>
  </Link>;
}
