import type { Metadata } from "next";
import Link from "next/link";
import { DirectoryShell } from "@/app/directorio/_components";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Respuestas sobre Chile3X, cuentas, publicación, moderación y el uso responsable del directorio para adultos.",
  alternates: { canonical: "/faq" },
};

const entries = [
  ["¿Qué es Chile3X?", "Es un directorio para personas adultas. Facilita encontrar perfiles, agencias y arriendos publicados; cualquier conversación o acuerdo se realiza directamente entre las personas involucradas."],
  ["¿Quién puede usar el sitio?", "Solo personas mayores de 18 años. Al ingresar confirmas esta condición y debes respetar los Términos, la Privacidad y las Reglas de publicación."],
  ["¿Cómo se publica un perfil?", "Crea una cuenta, completa el aviso y envíalo a revisión. El equipo decide si corresponde publicarlo, pedir cambios o rechazarlo. Por ahora las publicaciones iniciales se gestionan manualmente."],
  ["¿Por qué mi perfil o foto no se ve todavía?", "Los perfiles y cada medio nuevo pasan por moderación. Mientras están en revisión permanecen privados; no se muestran en buscadores ni en el directorio público."],
  ["¿Cómo funcionan favoritos, likes y reseñas?", "Necesitas una cuenta para guardar favoritos o reaccionar. Las reseñas se moderan antes de publicarse para reducir spam, suplantaciones y contenido que incumpla las reglas."],
  ["¿Chile3X guarda documentos de identidad o certificados médicos?", "No. La verificación se registra como un estado interno de revisión. No se habilita la carga ni el almacenamiento de documentos sensibles dentro del portal."],
  ["¿Chile3X cobra o interviene en los acuerdos?", "No interviene en pagos, citas ni acuerdos entre visitantes y anunciantes. Cualquier plan de publicación se coordina de forma directa con el equipo del portal."],
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: entries.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
};

export default function FaqPage() {
  return <DirectoryShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    <section className="static-page-hero"><p className="eyebrow">AYUDA</p><h1>Preguntas <em>frecuentes.</em></h1><p>Información clara sobre el funcionamiento inicial de Chile3X.</p></section>
    <section className="static-page-content faq-content">
      {entries.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
      <aside><h2>¿No encuentras una respuesta?</h2><p>Revisa nuestras reglas antes de publicar o usa uno de los canales oficiales del portal.</p><div><Link className="button button-primary" href="/contacto">Ir a contacto</Link><Link className="button button-outline" href="/reglas-de-publicacion">Ver reglas</Link></div></aside>
    </section>
  </DirectoryShell>;
}
