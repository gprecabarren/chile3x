import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryShell } from "@/app/directorio/_components";
import { getFaqEntries } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Respuestas sobre Chile3X, cuentas, publicación, moderación y el uso responsable del directorio para adultos.",
  alternates: { canonical: "/faq" },
};

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const entries = await getFaqEntries();
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
  };
  return <DirectoryShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    <section className="static-page-hero"><p className="eyebrow">AYUDA</p><h1>Preguntas <em>frecuentes.</em></h1><p>Información clara sobre el funcionamiento inicial de Chile3X.</p></section>
    <section className="static-page-content faq-content">
      {entries.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
      <aside><h2>¿No encuentras una respuesta?</h2><p>Revisa nuestras reglas antes de publicar o usa uno de los canales oficiales del portal.</p><div><Link className="button button-primary" href="/contacto">Ir a contacto</Link><Link className="button button-outline" href="/reglas-de-publicacion">Ver reglas</Link></div></aside>
    </section>
  </DirectoryShell>;
}
