import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { telegramBulletins } from "@/db/schema";
import { DirectoryShell } from "@/app/directorio/_components";
import { getTelegramConfiguration } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Novedades de Chile3X",
  description: "Actualizaciones breves sobre funciones, seguridad y cambios del sitio Chile3X.",
  alternates: { canonical: "/novedades" },
  openGraph: {
    title: "Novedades de Chile3X",
    description: "Actualizaciones breves sobre funciones, seguridad y cambios del sitio.",
    url: "/novedades",
    type: "website",
    locale: "es_CL",
  },
};

function date(value: string | null) {
  if (!value) return "Publicación reciente";
  const instant = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "America/Santiago" }).format(new Date(instant));
}

export default async function NovedadesPage() {
  const [bulletins, configuration] = await Promise.all([
    (await getDb()).select({
      id: telegramBulletins.id,
      title: telegramBulletins.title,
      body: telegramBulletins.body,
      source: telegramBulletins.source,
      publishedAt: telegramBulletins.publishedAt,
      updatedAt: telegramBulletins.updatedAt,
    }).from(telegramBulletins).where(eq(telegramBulletins.status, "published")).orderBy(desc(telegramBulletins.publishedAt), desc(telegramBulletins.createdAt)).limit(100),
    getTelegramConfiguration(),
  ]);
  return <DirectoryShell><div className="public-information-page novedades-page">
    <section className="information-hero"><p className="eyebrow">ACTUALIZACIONES DEL SITIO</p><h1>Novedades de Chile3X</h1><p>Cambios breves sobre funciones, seguridad, mantenimiento y comunidad. Las noticias editoriales siguen disponibles en su sección independiente.</p>{configuration.publicCommunityUrl && <a className="button button-primary" href={configuration.publicCommunityUrl} target="_blank" rel="noreferrer">Abrir comunidad en Telegram</a>}</section>
    {bulletins.length ? <section className="novedades-list" aria-label="Novedades publicadas">{bulletins.map((bulletin) => <article id={bulletin.id} key={bulletin.id}><header><span>{bulletin.source === "telegram" ? "Telegram y sitio web" : "Chile3X"}</span><time dateTime={bulletin.publishedAt ?? bulletin.updatedAt}>{date(bulletin.publishedAt ?? bulletin.updatedAt)}</time></header><h2>{bulletin.title}</h2><p>{bulletin.body}</p></article>)}</section> : <section className="novedades-empty"><h2>Aún no hay novedades publicadas</h2><p>Las próximas actualizaciones del sitio aparecerán aquí.</p></section>}
  </div></DirectoryShell>;
}
