import type { ReactNode } from "react";
import { DirectoryShell } from "@/app/directorio/_components";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  children: ReactNode;
  summary?: ReactNode;
  notice?: ReactNode;
};

export function LegalPage({ eyebrow, title, children, summary, notice }: LegalPageProps) {
  return (
    <DirectoryShell>
      <article className="legal-page">
        <header>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {summary ? <div className="legal-summary">{summary}</div> : null}
        </header>
        <div className="legal-content">{children}</div>
        {notice ? <aside>{notice}</aside> : null}
      </article>
    </DirectoryShell>
  );
}
