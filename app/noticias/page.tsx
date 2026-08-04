import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DirectoryShell } from "@/app/directorio/_components";
import { listNews } from "@/lib/news";
import { publicPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = publicPageMetadata({ title: "Noticias sobre escorts en Chile", description: "Noticias, seguridad, publicación responsable y novedades del directorio nacional de escorts Chile3X.", path: "/noticias", socialTitle: "Noticias Chile3X", socialDescription: "Información y novedades del directorio nacional de escorts en Chile." });
export default async function NewsPage() { const posts = await listNews(); return <DirectoryShell><main className="news-index"><header><p className="eyebrow">ACTUALIDAD CHILE3X</p><h1>Noticias sobre escorts y publicación responsable en Chile</h1><p>Información útil, seguridad, tendencias y novedades de nuestro directorio nacional.</p></header>{posts.length ? <section className="news-card-grid">{posts.map(({ post, cover }) => <article key={post.id}>{cover && <Link className="news-card-cover" href={`/noticias/${post.slug}`}><Image src={`/noticias/media/${cover.id}`} alt={post.title} fill unoptimized sizes="(max-width: 700px) 100vw, 33vw" /></Link>}<div><time dateTime={post.publishedAt ?? post.createdAt}>{new Intl.DateTimeFormat("es-CL", { dateStyle: "long" }).format(new Date(post.publishedAt ?? post.createdAt))}</time><h2><Link href={`/noticias/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><Link href={`/noticias/${post.slug}`}>Leer noticia →</Link></div></article>)}</section> : <section className="news-empty"><h2>Estamos preparando las primeras noticias</h2><p>Pronto encontrarás contenido útil para anunciantes y visitantes de todo Chile.</p></section>}</main></DirectoryShell>; }
