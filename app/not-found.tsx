import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryShell } from "@/app/directorio/_components";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata({
  title: "Página no encontrada",
  description: "La dirección que buscas no existe o ya no está disponible en Chile3X.",
  path: "/404",
});

export default function NotFoundPage() {
  return (
    <DirectoryShell>
      <section className="not-found-page">
        <p className="eyebrow">ERROR 404</p>
        <h1>Esta página no está disponible.</h1>
        <p>Puede que el enlace haya cambiado, la publicación ya no esté visible o la dirección no exista.</p>
        <div>
          <Link className="button button-primary" href="/escorts">Explorar escorts</Link>
          <Link className="button button-outline" href="/">Ir al inicio</Link>
        </div>
      </section>
    </DirectoryShell>
  );
}
