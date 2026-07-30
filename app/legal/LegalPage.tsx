import type { ReactNode } from "react";
import { DirectoryShell } from "@/app/directorio/_components";

export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: ReactNode }) {
  return (
    <DirectoryShell>
      <article className="legal-page">
        <header><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>Última actualización: {updated}</p></header>
        <div className="legal-content">{children}</div>
        <aside>Este texto establece las reglas operativas iniciales del portal. Antes de abrir cobros, guardar documentos o procesar contenido de pago, deberá revisarse con asesoría legal chilena especializada.</aside>
      </article>
    </DirectoryShell>
  );
}
