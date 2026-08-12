import type { Metadata } from "next";
import type { ReactNode } from "react";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  title: "Administración",
  description: "Área privada de administración de Chile3X.",
  path: "/admin",
});

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
