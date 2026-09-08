import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DirectoryShell } from "@/app/directorio/_components";
import { listNews } from "@/lib/news";
import { publicPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = publicPageMetadata({
  title: "Noticias, seguridad y guías para anunciantes",
  description: "Noticias de Chile3X sobre seguridad, publicación responsable, moderación y uso del directorio para adultos en Chile.",
  path: "/noticias",
  socialTitle: "Noticias y guías | Chile3X",
  socialDescription: "Seguridad, publicación responsable y novedades del directorio Chile3X.",
});

export default async function NewsPage() {
  const posts = await listNews();

  return <DirectoryShell>
    <main className="news-index">
      <header>
        <p className="eyebrow">ACTUALIDAD CHILE3X</p>
        <h1>Noticias, seguridad y publicación responsable</h1>
        <p>Información útil para anunciantes y visitantes, novedades del portal y criterios para usar el directorio con mayor claridad.</p>
      </header>
      {posts.length ? <section className="news-card-grid">
        {posts.map(({ post, cover }) => <article key={post.id}>
          {cover && <Link className="news-card-cover" href={`/noticias/${post.slug}`}><Image src={`/noticias/media/${cover.id}`} alt={post.title} fill unoptimized sizes="(max-width: 700px) 100vw, 33vw" /></Link>}
          <div>
            <time dateTime={post.publishedAt ?? post.createdAt}>{new Intl.DateTimeFormat("es-CL", { dateStyle: "long" }).format(new Date(post.publishedAt ?? post.createdAt))}</time>
            <h2><Link href={`/noticias/${post.slug}`}>{post.title}</Link></h2>
            <p>{post.excerpt}</p>
            <Link href={`/noticias/${post.slug}`}>Leer noticia →</Link>
          </div>
        </article>)}
      </section> : <section className="news-empty"><h2>Estamos preparando las primeras noticias</h2><p>Pronto encontrarás contenido útil para anunciantes y visitantes de todo Chile.</p></section>}
      <section className="news-index-guide" aria-labelledby="news-guide-title">
        <p className="eyebrow">GUÍAS DEL DIRECTORIO</p>
        <h2 id="news-guide-title">Información conectada con cada búsqueda</h2>
        <p>Las noticias complementan las páginas del directorio: explican criterios de moderación, buenas prácticas de seguridad y cambios relevantes del portal. Para buscar publicaciones, usa una página territorial o el directorio nacional; así cada contenido mantiene una intención clara sin repetir las guías locales.</p>
        <nav aria-label="Guías y destinos relacionados">
          <Link href="/escorts">Directorio nacional</Link>
          <Link href="/escorts/concepcion">Concepción</Link>
          <Link href="/escorts/vina-del-mar">Viña del Mar</Link>
          <Link href="/escorts/valdivia">Valdivia</Link>
          <Link href="/faq">Preguntas frecuentes</Link>
          <Link href="/reglas-de-publicacion">Reglas de publicación</Link>
        </nav>
      </section>
    </main>
  </DirectoryShell>;
}
