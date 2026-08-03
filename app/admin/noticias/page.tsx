import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { listNews } from "@/lib/news";
import { AdminPageHeading, AdminShell } from "../_components";
import { AdminNewsEditor } from "./AdminNewsEditor";

export const dynamic = "force-dynamic";
export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ edit?: string; notice?: string; error?: string }> }) {
  const admin = await getCurrentAdmin(); if (!admin) redirect("/api/auth/github/start?return_to=/admin/noticias");
  const query = await searchParams; const posts = await listNews(true); const selected = posts.find(({ post }) => post.id === query.edit)?.post;
  return <AdminShell user={admin}><div className="admin-content"><AdminPageHeading eyebrow="CONTENIDO Y SEO" title="Noticias Chile3X" description="Publica artículos nacionales y por ciudad con portada, contenido enriquecido, Open Graph y metadatos SEO." backHref="/admin"><Link className="button button-outline" href="/noticias" target="_blank">Ver blog público</Link></AdminPageHeading>
    {query.notice && <p className="admin-success">{query.notice === "deleted" ? "La noticia fue eliminada." : query.notice === "created" ? "La noticia fue creada." : "La noticia fue actualizada."}</p>}{query.error && <p className="form-alert">El título debe tener al menos 5 caracteres y el contenido al menos 30.</p>}
    <section className="admin-news-layout"><aside className="admin-news-list"><Link className="button button-primary" href="/admin/noticias">Nueva noticia</Link>{posts.map(({ post }) => <Link className={selected?.id === post.id ? "is-active" : undefined} href={`/admin/noticias?edit=${post.id}`} key={post.id}><strong>{post.title}</strong><span>{post.status === "published" ? "Publicada" : "Borrador"} · {post.slug}</span></Link>)}</aside><AdminNewsEditor initial={selected ? { id: selected.id, title: selected.title, slug: selected.slug, excerpt: selected.excerpt, contentHtml: selected.contentHtml, coverMediaId: selected.coverMediaId, status: selected.status, seoTitle: selected.seoTitle, metaDescription: selected.metaDescription, focusKeyword: selected.focusKeyword, canonicalUrl: selected.canonicalUrl, ogTitle: selected.ogTitle, ogDescription: selected.ogDescription, noindex: selected.noindex } : undefined} /></section>
  </div></AdminShell>;
}
