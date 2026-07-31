import { and, asc, count, eq, gte, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles, profileViews } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "../../_components";

export const dynamic = "force-dynamic";

const periodOptions = {
  day: { label: "Hoy", days: 0 },
  week: { label: "7 días", days: 6 },
  month: { label: "30 días", days: 29 },
  all: { label: "Todo el período", days: null },
} as const;

type Period = keyof typeof periodOptions;

export default async function ProfileStatisticsPage({ params, searchParams }: { params: Promise<{ profileId: string }>; searchParams: Promise<{ periodo?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta");

  const [{ profileId }, query] = await Promise.all([params, searchParams]);
  const period = query.periodo && query.periodo in periodOptions ? query.periodo as Period : "week";
  const option = periodOptions[period];
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, displayName: profiles.displayName, slug: profiles.slug, status: profiles.status })
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.ownerId, user.id)))
    .limit(1);

  if (!profile) redirect("/mi-cuenta");

  const since = option.days === null ? null : sql<string>`date('now', ${`-${option.days} days`})`;
  const conditions = [eq(profileViews.profileId, profile.id), ...(since ? [gte(profileViews.viewedOn, since)] : [])];
  const rows = await db.select({ day: profileViews.viewedOn, total: count() })
    .from(profileViews)
    .where(and(...conditions))
    .groupBy(profileViews.viewedOn)
    .orderBy(asc(profileViews.viewedOn));
  const total = rows.reduce((sum, row) => sum + Number(row.total), 0);

  return <AccountShell user={user}>
    <div className="account-content">
      <AccountHeading eyebrow="ALCANCE DEL AVISO" title="Visualizaciones" description={`Consulta el alcance de ${profile.displayName} por período. Una misma persona cuenta solo una vez al día para este aviso.`}>
        {profile.status === "approved" && <Link className="button button-public-preview" href={`/perfil/${profile.slug}`} target="_blank">Ver público</Link>}
      </AccountHeading>
      <section className="profile-statistics-panel">
        <div className="profile-statistics-periods" aria-label="Período de estadísticas">{Object.entries(periodOptions).map(([key, item]) => <Link key={key} href={`/mi-cuenta/${profile.id}/estadisticas?periodo=${key}`} className={key === period ? "is-active" : ""}>{item.label}</Link>)}</div>
        <div className="profile-statistics-total"><span>Visualizaciones en {option.label.toLowerCase()}</span><strong>{total}</strong></div>
        {rows.length ? <div className="profile-statistics-table"><div><span>Fecha</span><span>Visualizaciones</span></div>{rows.map((row) => <div key={row.day}><span>{new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "long", timeZone: "America/Santiago" }).format(new Date(`${row.day}T12:00:00Z`))}</span><strong>{row.total}</strong></div>)}</div> : <p className="profile-statistics-empty">Todavía no hay visualizaciones registradas para este período.</p>}
      </section>
    </div>
  </AccountShell>;
}
