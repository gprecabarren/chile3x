import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "@/app/NavigationLink";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles, reviews, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "../_components";
import { AccountSocialTabs } from "../AccountSocialTabs";

export const dynamic = "force-dynamic";
const labels = { pending: "Pendiente de aprobación", approved: "Publicado" };
function date(value: string) { return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`)); }
function pageNumber(value?: string) { return Math.max(1, Math.min(10_000, Number.parseInt(value ?? "1", 10) || 1)); }

export default async function AccountCommentsPage({ searchParams }: { searchParams: Promise<{ notice?: string; perfil?: string; pagina?: string; enviadas?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/comentarios");
  const [db, params] = await Promise.all([getDb(), searchParams]);
  const receivedPage = pageNumber(params.pagina), sentPage = pageNumber(params.enviadas);
  const pageHref = (pagina: number, enviadas: number) => `/mi-cuenta/comentarios?${new URLSearchParams({ pagina: String(pagina), enviadas: String(enviadas), ...(params.perfil ? { perfil: params.perfil } : {}) })}`;
  const receivedConditions = [eq(profiles.ownerId, user.id), inArray(reviews.status, ["pending", "approved"])];
  if (params.perfil) receivedConditions.push(eq(profiles.id, params.perfil));
  const [received, sent] = await Promise.all([
    db.select({ id: reviews.id, body: reviews.body, status: reviews.status, createdAt: reviews.createdAt, profileName: profiles.displayName, profileId: profiles.id, authorName: users.displayName, authorUsername: users.username }).from(reviews)
      .innerJoin(profiles, eq(reviews.profileId, profiles.id)).innerJoin(users, eq(reviews.authorId, users.id))
      .where(and(...receivedConditions)).orderBy(desc(reviews.createdAt), desc(reviews.id)).limit(51).offset((receivedPage - 1) * 50),
    db.select({ id: reviews.id, body: reviews.body, status: reviews.status, createdAt: reviews.createdAt, profileName: profiles.displayName, profileHandle: profiles.handle, profileSlug: profiles.slug }).from(reviews)
      .innerJoin(profiles, eq(reviews.profileId, profiles.id)).where(and(eq(reviews.authorId, user.id), inArray(reviews.status, ["pending", "approved"])))
      .orderBy(desc(reviews.createdAt), desc(reviews.id)).limit(51).offset((sentPage - 1) * 50),
  ]);
  const hasMoreReceived = received.length > 50, hasMoreSent = sent.length > 50;
  received.splice(50); sent.splice(50);
  const notices: Record<string, string> = { approved: "Comentario publicado.", rejected: "Comentario rechazado y retirado.", removed: "Comentario eliminado.", withdrawn: "Tu reseña pendiente fue retirada." };
  return <AccountShell user={user}><div className="account-content">
    <AccountHeading eyebrow="MI CUENTA" title="Favoritos y comentarios" description="Tus anuncios guardados y tus comentarios, reunidos en un solo lugar privado." backHref="/mi-cuenta" />
    <AccountSocialTabs active="comments" />
    {params.notice && notices[params.notice] && <p className="form-alert" role="status">{notices[params.notice]}</p>}
    <h2 className="account-section-title">Comentarios recibidos</h2><p className="account-comments-help">Tú decides cuáles se publican en tus anuncios. Los pendientes son privados; los rechazados o eliminados dejan de aparecer. Del más reciente al más antiguo.</p>
    <section className="account-comments-list" aria-label="Comentarios recibidos">{received.length ? received.map(row => <article key={row.id} className={row.status === "pending" ? "is-pending-review" : ""}><div><span className={`account-status account-status-${row.status === "approved" ? "approved" : "pending"}`}>{labels[row.status as keyof typeof labels]}</span><h3>{row.profileName}</h3><small>{row.authorName?.trim() || (row.authorUsername ? `@${row.authorUsername}` : "Usuario de Chile3X")} · {date(row.createdAt)}</small></div><p>{row.body}</p><div className="account-review-actions"><Link href={`/mi-cuenta/${row.profileId}/editar`}>Abrir anuncio</Link><form action={`/api/mi-cuenta/comentarios/${row.id}`} method="post">{row.status === "pending" && <><button className="button button-primary" type="submit" name="action" value="approve">Aprobar</button><button className="button button-outline" type="submit" name="action" value="reject">Rechazar</button></>}<button className="button button-outline" type="submit" name="action" value="delete">Eliminar</button></form></div></article>) : <p className="account-empty">No hay comentarios por revisar ni publicados en tus anuncios.</p>}</section>
    <nav className="admin-review-tabs" aria-label="Paginación de comentarios recibidos">{receivedPage > 1 && <Link href={pageHref(receivedPage - 1, sentPage)} prefetch={false}>Anterior</Link>}{hasMoreReceived && <Link href={pageHref(receivedPage + 1, sentPage)} prefetch={false}>Siguiente</Link>}</nav>
    <h2 className="account-sent-reviews-heading">Reseñas que enviaste</h2><p className="account-comments-help">Puedes retirar tus reseñas mientras estén pendientes.</p>
    <section className="account-comments-list" aria-label="Reseñas enviadas">{sent.length ? sent.map(row => <article key={row.id} className={row.status === "pending" ? "is-pending-review" : ""}><div><span className={`account-status account-status-${row.status === "approved" ? "approved" : "pending"}`}>{labels[row.status as keyof typeof labels]}</span><h3>{row.profileName}</h3><small>{date(row.createdAt)}</small></div><p>{row.body}</p><div className="account-review-actions"><Link href={`/perfil/${row.profileHandle ? `@${row.profileHandle}` : row.profileSlug}`}>Ver anuncio</Link>{row.status === "pending" && <form action={`/api/mi-cuenta/resenas/${row.id}`} method="post"><button className="button button-outline" type="submit">Eliminar reseña pendiente</button></form>}</div></article>) : <p className="account-empty">Aún no tienes reseñas pendientes o publicadas.</p>}</section>
    <nav className="admin-review-tabs" aria-label="Paginación de reseñas enviadas">{sentPage > 1 && <Link href={pageHref(receivedPage, sentPage - 1)} prefetch={false}>Anterior</Link>}{hasMoreSent && <Link href={pageHref(receivedPage, sentPage + 1)} prefetch={false}>Siguiente</Link>}</nav>
  </div></AccountShell>;
}
