import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";
import "./forum.css";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Foro privado beta", description: "Área de desarrollo del foro de Chile3X, reservada a administración.", path: "/foro" });

export default function ForumLayout({ children }: { children: ReactNode }) {
  // Reuse the deferred panel bundle outside /admin without adding it to public pages.
  // eslint-disable-next-line @next/next/no-css-tags
  return <><link href="/assets/panels-20260923.css?v=20261010-social-access" precedence="panels" rel="stylesheet" />{children}</>;
}
