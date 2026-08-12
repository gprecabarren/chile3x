import type { ReactNode } from "react";
import { DirectoryShell } from "@/app/directorio/_components";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
  code?: string;
  version?: string;
  summary?: ReactNode;
  notice?: ReactNode;
};

export function LegalPage({ eyebrow, title, updated, children, code, version, summary, notice }: LegalPageProps) {
  return (
    <DirectoryShell>
      <article className="legal-page">
        <header>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {summary ? <div className="legal-summary">{summary}</div> : null}
          <div className="legal-meta" aria-label="Información del documento">
            {code ? <span>{code}</span> : null}
            {version ? <span>Versión {version}</span> : null}
            <span>Vigente desde {updated}</span>
          </div>
        </header>
        <div className="legal-content">{children}</div>
        <aside>
          {notice ?? <>Estas reglas forman parte del marco operativo de Chile3X. Las funciones nuevas o los cambios relevantes se informarán antes de entrar en vigor.</>}
        </aside>
      </article>
    </DirectoryShell>
  );
}
