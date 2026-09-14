import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectoryShell } from "@/app/directorio/_components";
import { getCurrentAdmin } from "@/lib/auth";
import { safeJsonLd } from "@/lib/json-ld";
import { publicPageMetadata } from "@/lib/seo";
import { getSiteSettings, siteBaseUrl } from "@/lib/site-settings";
import { listPublicSponsorGroups } from "@/lib/sponsors";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const enabled = settings.sponsors_enabled === "enabled";
  return {
    ...publicPageMetadata({
      title: "Sitios asociados y servicios para adultos en Chile",
      description: "Conoce sitios asociados a Chile3X: spas, masajes y plataformas para adultos en Chile, organizados en una guía clara y actualizable.",
      path: "/patrocinadores",
      socialTitle: "Sitios asociados | Chile3X",
      socialDescription: "Selección de sitios y servicios asociados a Chile3X para personas adultas en Chile.",
    }),
    robots: enabled ? { index: true, follow: true } : { index: false, follow: false, noarchive: true },
  };
}

export default async function SponsorsPage() {
  const settings = await getSiteSettings();
  const enabled = settings.sponsors_enabled === "enabled";
  const admin = enabled ? null : await getCurrentAdmin();
  if (!enabled && !admin) notFound();
  const groups = await listPublicSponsorGroups();
  const siteUrl = siteBaseUrl(settings.site_url);
  const cards = groups.flatMap((group) => group.sponsors);
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Sitios asociados a Chile3X",
    description: "Guía de sitios y servicios asociados para personas adultas en Chile.",
    url: `${siteUrl}/patrocinadores`,
    inLanguage: "es-CL",
    isPartOf: { "@type": "WebSite", name: "Chile3X", url: siteUrl },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: cards.length,
      itemListElement: cards.map((card, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: card.name,
        url: card.destinationUrl,
      })),
    },
  };

  return <DirectoryShell>
    <main className="sponsors-page">
      {enabled && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />}
      {!enabled && <aside className="sponsors-admin-preview"><strong>Vista administrativa</strong><span>La página está oculta para visitantes y buscadores.</span><Link href="/admin/patrocinadores">Administrar</Link></aside>}
      <header className="sponsors-hero">
        <p className="eyebrow">RED CHILE3X</p>
        <h1>Sitios asociados y servicios para adultos en Chile</h1>
      </header>
      {groups.map((group) => <section className="sponsor-group" aria-label={groups.length === 1 ? "Sitios asociados" : undefined} aria-labelledby={groups.length > 1 ? `sponsor-group-${group.slug}` : undefined} key={group.id}>
        {groups.length > 1 && <header><p className="eyebrow">SITIOS ASOCIADOS</p><h2 id={`sponsor-group-${group.slug}`}>{group.name}</h2>{group.description && <p>{group.description}</p>}</header>}
        <div className="sponsor-card-grid">
          {group.sponsors.map((card) => <article className={`sponsor-card sponsor-card-${card.displayMode}`} key={card.id}>
            <a href={card.destinationUrl} target="_blank" rel={`${card.isSponsored ? "sponsored " : ""}noreferrer`} aria-label={`${card.ctaLabel}: ${card.name}`}>
              <Image className="sponsor-card-background" src={`/patrocinadores/media/${card.id}/background`} alt={card.imageAlt} fill unoptimized sizes="(max-width: 680px) 100vw, (max-width: 1050px) 50vw, 33vw" style={{ objectFit: card.displayMode === "brand" ? "contain" : "cover" }} />
              <span className="sponsor-card-shade" aria-hidden="true" />
              <span className="sponsor-card-content">
                {card.logoR2Key && <Image className="sponsor-card-logo" src={`/patrocinadores/media/${card.id}/logo`} alt={`Logo de ${card.name}`} width={260} height={130} unoptimized />}
              {(card.headline || card.subtitle) && <span className="sponsor-card-copy">{card.headline && <strong>{card.headline}</strong>}{card.subtitle && <small>{card.subtitle}</small>}</span>}
                <span className="sponsor-card-cta">{card.ctaLabel}</span>
              </span>
            </a>
          </article>)}
        </div>
      </section>)}
      {!cards.length && <section className="sponsors-empty"><h2>Estamos preparando esta selección</h2><p>Los sitios asociados aparecerán aquí cuando el equipo complete su revisión y publicación.</p></section>}
      <section className="sponsors-disclosure"><h2>Información sobre estos enlaces</h2><p>Chile3X muestra estos sitios como referencias externas y no gestiona sus servicios, pagos ni condiciones. Revisa directamente la información, políticas y canales oficiales de cada plataforma antes de contactarla.</p><Link href="/contacto">Contactar a Chile3X</Link></section>
    </main>
  </DirectoryShell>;
}
