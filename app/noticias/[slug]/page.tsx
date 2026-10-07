import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/app/NavigationLink";
import { notFound } from "next/navigation";
import { DirectoryShell } from "@/app/directorio/_components";
import { getNewsBySlug, textFromHtml } from "@/lib/news";
import { safeJsonLd } from "@/lib/json-ld";
import { socialCardImageUrl } from "@/lib/seo";
import { newsCanonicalUrl, newsIsoDate, newsStructuredData } from "@/lib/news-seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };
const dateFormatter = new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" });

function withoutSiteSuffix(value: string) {
  return value.replace(/\s*\|\s*Chile3X\s*$/i, "").trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const row = await getNewsBySlug(slug);
  if (!row) return {};
  const { post, cover } = row;
  const description = post.metaDescription || post.excerpt || textFromHtml(post.contentHtml).slice(0, 160);
  const image = cover ? `/noticias/media/${cover.id}` : socialCardImageUrl;
  const title = withoutSiteSuffix(post.seoTitle || post.title);
  const socialTitle = withoutSiteSuffix(post.ogTitle || post.seoTitle || post.title);
  const canonical = newsCanonicalUrl(post.slug, post.canonicalUrl);
  return {
    title,
    description,
    alternates: { canonical },
    robots: post.noindex ? { index: false, follow: true } : undefined,
    openGraph: { title: socialTitle, description: post.ogDescription || description, url: canonical, type: "article", siteName: "Chile3X", images: [image], publishedTime: newsIsoDate(post.publishedAt ?? post.createdAt) ?? undefined, modifiedTime: newsIsoDate(post.updatedAt) ?? undefined },
    twitter: { card: "summary_large_image", title: socialTitle, description: post.ogDescription || description, images: [image] },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const row = await getNewsBySlug(slug);
  if (!row) notFound();
  const { post, cover } = row;
  const schema = newsStructuredData(post, cover?.id);
  const publishedAt = newsIsoDate(post.publishedAt ?? post.createdAt);
  const updatedAt = newsIsoDate(post.updatedAt);

  return <DirectoryShell>
    <main className="news-article">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
      <nav className="news-breadcrumbs" aria-label="Ruta de navegación"><Link href="/">Inicio</Link><span aria-hidden="true">/</span><Link href="/noticias">Noticias</Link><span aria-hidden="true">/</span><span aria-current="page">Artículo</span></nav>
      <Link className="page-back-link" href="/noticias">← Volver a noticias</Link>
      <header>
        <p className="eyebrow">NOTICIAS CHILE3X</p>
        <h1>{post.title}</h1>
        <p>{post.excerpt}</p>
        <div className="news-article-byline">
          <Link href="/quienes-somos" rel="author">Por Chile3X</Link>
          {publishedAt && <span>Publicado: <time dateTime={publishedAt}>{dateFormatter.format(new Date(publishedAt))}</time></span>}
          {updatedAt && updatedAt !== publishedAt && <span>Actualizado: <time dateTime={updatedAt}>{dateFormatter.format(new Date(updatedAt))}</time></span>}
        </div>
      </header>
      {cover && <figure className="news-article-cover"><Image src={`/noticias/media/${cover.id}`} alt={post.title} fill priority unoptimized sizes="100vw" /></figure>}
      <article className="news-article-content" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
      <footer>
        <h2>Continúa en Chile3X</h2>
        <p>Consulta el directorio por ciudad, revisa las preguntas frecuentes o crea una cuenta para preparar una publicación.</p>
        <div>
          <Link className="button button-primary" href="/escorts">Directorio nacional</Link>
          <Link className="button button-outline" href="/escorts/concepcion">Concepción</Link>
          <Link className="button button-outline" href="/escorts/vina-del-mar">Viña del Mar</Link>
          <Link className="button button-outline" href="/faq">Preguntas frecuentes</Link>
          <Link className="button button-outline" href="/registro">Crear cuenta</Link>
        </div>
      </footer>
    </main>
  </DirectoryShell>;
}
