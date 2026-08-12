import type { Metadata } from "next";
import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  title: "Mi cuenta",
  description: "Área privada para administrar cuentas y publicaciones de Chile3X.",
  path: "/mi-cuenta",
});

export default function AccountLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
