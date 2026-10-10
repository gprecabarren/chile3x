import type { Metadata } from "next";
import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";

const PANEL_STYLESHEET = "/assets/panels-20260923.css?v=20261010-account";

export const metadata: Metadata = privatePageMetadata({
  title: "Administración",
  description: "Área privada de administración de Chile3X.",
  path: "/admin",
});

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <><link href={PANEL_STYLESHEET} precedence="panels" rel="stylesheet" />{children}</>;
}
