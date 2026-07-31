import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles, reviews, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";

export const dynamic = "force-dynamic";

const noticeText: Record<string, string> = { approved: "La reseña fue publicada.", rejected: "La reseña fue rechazada.", deleted: "La reseña fue eliminada.", error: "No se pudo actualizar la reseña." };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ notice?: string; estado?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/resenas");
  const params = await searchParams;
  const selected = ["pending", "approved", "rejected"].includes(params.estado ?? "") ? params.estado! : "pending";
  const rows = await (await getDb()).select({ review: reviews, profileName: profiles.displayName, profileSlug: profiles.slug, authorName: users.displayName, authorEmail: users.email })
    .from(reviews).innerJoin(profiles, eq(reviews.profileId, profiles.id)).innerJoin(users, eq(reviews.authorId, users.id)).where(eq(reviews.status, selected as "pending" | "approved" | "rejected")).orderBy(desc(reviews.createdAt));
  return <AdminShell user={admin}><div className="admin-content"><AdminPageHeading eyebrow="MODERACIÓN" title="Reseñas y comentarios" description="Cada comentario pasa por Turnstile y queda pendiente hasta tu decisión." />
    {params.notice && noticeText[params.notice] && <p className="admin-success" role="status">{noticeText[params.notice]}</p>}
    <nav className="admin-review-tabs" aria-label="Estados de reseñas"><a href="/admin/resenas?estado=pending" className={selected === "pending" ? "is-active" : undefined}>Pendientes</a><a href="/admin/resenas?estado=approved" className={selected === "approved" ? "is-active" : undefined}>Publicadas</a><a href="/admin/resenas?estado=rejected" className={selected === "rejected" ? "is-active" : undefined}>Rechazadas</a></nav>
    {rows.length > 0 ? <section className="admin-review-list">{rows.map((row) => <article key={row.review.id}><div><span className={`media-status media-status-${row.review.status === "approved" ? "approved" : row.review.status === "pending" ? "pending" : "rejected"}`}>{row.review.status === "pending" ? "En revisión" : row.review.status === "approved" ? "Publicada" : "Rechazada"}</span><h2>{row.profileName}</h2><p>{row.authorName ?? "Usuario de Chile3X"} · {row.authorEmail}</p><blockquote>{row.review.body}</blockquote></div><form action={`/api/admin/resenas/${row.review.id}`} method="post"><button className="button button-primary" type="submit" name="action" value="approve" disabled={row.review.status === "approved"}>Publicar</button><button className="button button-outline" type="submit" name="action" value="reject" disabled={row.review.status === "rejected"}>Rechazar</button><button className="button button-outline" type="submit" name="action" value="delete">Eliminar</button></form></article>)}</section> : <section className="admin-empty"><h2>No hay reseñas en este estado</h2><p>Las nuevas reseñas aparecen aquí después de superar Turnstile.</p></section>}
  </div></AdminShell>;
}
