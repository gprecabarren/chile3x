import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles, reviews, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "../_components";

export const dynamic = "force-dynamic";

const labels: Record<string, string> = { pending: "En moderación", approved: "Publicado", rejected: "Rechazado" };

export default async function AccountCommentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/comentarios");
  const rows = await (await getDb()).select({ id: reviews.id, body: reviews.body, status: reviews.status, createdAt: reviews.createdAt, profileName: profiles.displayName, profileId: profiles.id, authorName: users.displayName }).from(reviews)
    .innerJoin(profiles, eq(reviews.profileId, profiles.id))
    .innerJoin(users, eq(reviews.authorId, users.id))
    .where(eq(profiles.ownerId, user.id)).orderBy(desc(reviews.createdAt));

  return <AccountShell user={user}><div className="account-content"><AccountHeading eyebrow="GESTIÓN DE ANUNCIOS" title="Comentarios recibidos" description="Revisa las reseñas enviadas a tus anuncios. El portal las modera antes de mostrarlas públicamente." backHref="/mi-cuenta" />
    <section className="account-comments-list">{rows.length ? rows.map((row) => <article key={row.id}><div><span className={`account-status account-status-${row.status === "approved" ? "approved" : row.status === "rejected" ? "rejected" : "pending"}`}>{labels[row.status]}</span><h2>{row.profileName}</h2><small>{row.authorName ?? "Usuario"} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(`${row.createdAt}Z`.replace("ZZ", "Z")))}</small></div><p>{row.body}</p><Link href={`/mi-cuenta/${row.profileId}/editar`}>Abrir anuncio</Link></article>) : <p className="account-empty">Aún no hay comentarios en tus anuncios.</p>}</section>
  </div></AccountShell>;
}
