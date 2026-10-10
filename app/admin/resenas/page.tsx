import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles, reviews, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { AdminPageHeading, AdminShell } from "../_components";

export const dynamic = "force-dynamic";
export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ notice?: string; estado?: string; perfil?: string; pagina?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/resenas");
  if (!adminHasCapability(admin, "reviews.moderate")) redirect("/admin/acceso-denegado?reason=permission");
  const params = await searchParams;
  const selected = params.estado === "approved" ? "approved" : "pending";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.pagina ?? "1", 10) || 1));
  const conditions = [eq(reviews.status, selected)];
  if (params.perfil) conditions.push(eq(reviews.profileId, params.perfil));
  const rows = await (await getDb()).select({ review: reviews, profileName: profiles.displayName, profileHandle: profiles.handle, profileSlug: profiles.slug, authorId: users.id, authorUsername: users.username, authorName: users.displayName, authorEmail: users.email }).from(reviews)
    .innerJoin(profiles, eq(reviews.profileId, profiles.id)).innerJoin(users, eq(reviews.authorId, users.id)).where(and(...conditions))
    .orderBy(desc(reviews.createdAt), desc(reviews.id)).limit(51).offset((page - 1) * 50);
  const href = (estado: string, pagina = 1) => `/admin/resenas?${new URLSearchParams({ estado, pagina: String(pagina), ...(params.perfil ? { perfil: params.perfil } : {}) })}`;
  return <AdminShell user={admin}><div className="admin-content"><AdminPageHeading eyebrow="COMENTARIOS DE ANUNCIOS" title="Reseñas y comentarios" description="La aprobación y el rechazo corresponden al anunciante. Administración puede consultar los pendientes y publicados o eliminarlos. Los rechazados y retirados no aparecen." />
    {params.notice === "deleted" && <p className="admin-success" role="status">Comentario eliminado.</p>}
    <nav className="admin-review-tabs" aria-label="Estados de reseñas"><Link href={href("pending")} prefetch={false} className={selected === "pending" ? "is-active" : undefined}>Pendientes del anunciante</Link><Link href={href("approved")} prefetch={false} className={selected === "approved" ? "is-active" : undefined}>Publicados</Link>{params.perfil && <Link href="/admin/resenas" prefetch={false}>Ver todos los anuncios</Link>}</nav>
    {rows.length ? <section className="admin-review-list">{rows.slice(0, 50).map(row => <article key={row.review.id}><div><span className={`media-status media-status-${row.review.status}`}>{row.review.status === "pending" ? "Espera al anunciante" : "Publicado"}</span><h2>{row.profileName}</h2><p><Link href={`/admin/cuentas/${row.authorId}`} prefetch={false}>{row.authorName?.trim() || (row.authorUsername ? `@${row.authorUsername}` : "Usuario de Chile3X")}</Link> · {row.authorEmail}</p><blockquote>{row.review.body}</blockquote><Link href={`/perfil/${row.profileHandle ? `@${row.profileHandle}` : row.profileSlug}`} prefetch={false}>Ver anuncio</Link></div><form action={`/api/admin/resenas/${row.review.id}`} method="post"><button className="button button-outline" type="submit" name="action" value="delete">Eliminar comentario</button></form></article>)}</section> : <section className="admin-empty"><h2>No hay comentarios en este estado</h2></section>}
    <nav className="admin-review-tabs" aria-label="Paginación de comentarios">{page > 1 && <Link href={href(selected, page - 1)} prefetch={false}>Anterior</Link>}{rows.length > 50 && <Link href={href(selected, page + 1)} prefetch={false}>Siguiente</Link>}</nav>
  </div></AdminShell>;
}
