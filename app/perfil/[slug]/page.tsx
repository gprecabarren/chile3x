import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectoryShell, ProfileCard } from "@/app/directorio/_components";
import { getCityPath, getProfileDisplayTags, getPublicProfiles, type PublicProfile } from "@/lib/directory";

export const dynamic = "force-dynamic";

type ProfilePageProps = { params: Promise<{ slug: string }> };

function profileTypeLabel(type: PublicProfile["type"]) {
  return type === "escort" ? "Escort" : type === "agency" ? "Agencia" : "Arriendo";
}

function metadataFacts(profile: PublicProfile) {
  const metadata = profile.details.metadata;
  if (profile.type === "escort") return [
    ["Edad", metadata.age ? `${metadata.age} años` : null], ["Género", metadata.gender], ["Nacionalidad", metadata.nationality], ["Idiomas", metadata.languages],
    ["Color de piel", metadata.skin_color], ["Color de pelo", metadata.hair_color], ["Tipo de cuerpo", metadata.body_type], ["Busto", metadata.bust_size],
    ["Medidas", metadata.measurements], ["Estatura", metadata.height_cm ? `${metadata.height_cm} cm` : null], ["Peso", metadata.weight_kg ? `${metadata.weight_kg} kg` : null],
  ];
  if (profile.type === "agency") return [
    ["Años en el mercado", metadata.agency_years], ["Sitio web", metadata.website], ["Promociones", metadata.promotions], ["Métodos de contacto", metadata.contact_methods],
  ];
  return [
    ["Tipo de habitación", metadata.room_type], ["Amoblada", metadata.furnished], ["Baño privado", metadata.private_bathroom], ["Ventana al exterior", metadata.exterior_window],
    ["Tamaño", metadata.room_size ? `${metadata.room_size} m²` : null], ["Gastos comunes", metadata.common_expenses], ["Garantía", metadata.deposit],
    ["Duración mínima", metadata.minimum_rental], ["Disponibilidad inmediata", metadata.immediate_available], ["Internet/Wi-Fi", metadata.wifi],
    ["Agua, luz y gas", metadata.utilities_included], ["Uso de cocina", metadata.kitchen], ["Lavadora/secadora", metadata.laundry],
  ];
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = (await getPublicProfiles()).find((item) => item.slug === slug);
  if (!profile) return {};
  return {
    title: `${profile.displayName} en ${profile.city} | Chile3X`,
    description: profile.shortDescription,
    alternates: { canonical: `/perfil/${profile.slug}` },
  };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params;
  const profiles = await getPublicProfiles();
  const profile = profiles.find((item) => item.slug === slug);
  if (!profile) notFound();
  const agencyProfiles = profiles.filter((item) => profile.agencyIds.includes(item.id));
  const agencyMembers = profiles.filter((item) => profile.memberIds.includes(item.id));
  const facts = metadataFacts(profile).filter((item): item is [string, string] => Boolean(item[1]));
  const tags = getProfileDisplayTags(profile);
  const location = [profile.comuna, profile.city, profile.region].filter(Boolean).join(", ");
  const schema = { "@context": "https://schema.org", "@type": "Person", name: profile.displayName, description: profile.shortDescription, address: { "@type": "PostalAddress", addressLocality: profile.city, addressRegion: profile.region, addressCountry: "CL" } };

  return (
    <DirectoryShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <section className="profile-page-shell">
        <div className="profile-page-visual"><span>{profile.displayName.slice(0, 1)}</span>{profile.isDemo && <p>PERFIL DE DEMOSTRACIÓN</p>}</div>
        <div className="profile-page-summary">
          <p className="eyebrow">{profileTypeLabel(profile.type).toUpperCase()} · {profile.city.toUpperCase()}</p>
          <h1>{profile.displayName} {profile.verificationStatus === "reviewed" && profile.type === "escort" && <span className="verified-sticker" title="Perfil comprobado">✓</span>}</h1>
          <p className="profile-page-location"><Link href={getCityPath(profile.city)}>{location}</Link></p>
          <div className="public-tag-row">{tags.map((tag) => <span key={tag} className={`public-tag ${tag.toLowerCase().replaceAll(" ", "-")}`}>{tag}</span>)}</div>
          <p className="profile-page-description">{profile.description}</p>
          <div className="profile-contact-box">
            <strong>{profile.details.priceAmount !== null ? `Desde $${profile.details.priceAmount.toLocaleString("es-CL")} ${profile.details.currency}` : "Consulta disponibilidad"}</strong>
            {profile.isDemo ? <p>Este es un perfil de demostración: el contacto está desactivado.</p> : <a className="button button-primary" href={`https://wa.me/${profile.contactWhatsapp}`} target="_blank" rel="noreferrer">Contactar por WhatsApp</a>}
          </div>
        </div>
      </section>
      <section className="profile-detail-layout">
        <div className="profile-detail-main">
          {profile.details.schedule && <section className="profile-detail-section"><h2>Disponibilidad</h2><p>{profile.details.schedule}</p></section>}
          {facts.length > 0 && <section className="profile-detail-section"><h2>{profile.type === "rental" ? "Características" : "Información del perfil"}</h2><dl className="profile-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
          {(profile.servicesIncluded.length > 0 || profile.servicesAdditional.length > 0) && <section className="profile-detail-section service-detail-section"><h2>Servicios</h2><div>{profile.servicesIncluded.length > 0 && <article><h3>Incluidos</h3><ul>{profile.servicesIncluded.map((item) => <li key={item}>{item}</li>)}</ul></article>}{profile.servicesAdditional.length > 0 && <article><h3>Adicionales</h3><ul>{profile.servicesAdditional.map((item) => <li key={item}>{item}</li>)}</ul></article>}</div></section>}
        </div>
        <aside className="profile-detail-aside"><p className="eyebrow">UBICACIÓN</p><h2>{profile.city}</h2><p>{profile.details.referenceLocation ?? "Ubicación referencial disponible al contactar."}</p><Link className="button button-outline" href={getCityPath(profile.city)}>Ver más en {profile.city}</Link></aside>
      </section>
      {profile.type === "agency" && <section className="profile-association-section"><p className="eyebrow">PERFILES ASOCIADOS</p><h2>Escorts de {profile.displayName}</h2><p>Los perfiles se muestran aquí solo después de aceptar la invitación de la agencia.</p><div className="public-profile-grid">{agencyMembers.map((member) => <ProfileCard profile={member} key={member.id} />)}</div>{agencyMembers.length === 0 && <p className="association-empty">Esta agencia aún no tiene perfiles asociados aprobados.</p>}</section>}
      {profile.type === "escort" && agencyProfiles.length > 0 && <section className="profile-association-section compact"><p className="eyebrow">ASOCIACIONES ACEPTADAS</p><h2>Agencias relacionadas</h2><div className="public-profile-grid">{agencyProfiles.map((agency) => <ProfileCard profile={agency} key={agency.id} />)}</div></section>}
    </DirectoryShell>
  );
}
