import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectoryShell, PortalContactIcon, ProfileCard } from "@/app/directorio/_components";
import { ProfileStoryTrigger, StoryRail } from "@/app/historias/StoryRail";
import { ProfileViewTracker } from "../ProfileViewTracker";
import { getCityPath, getProfileDisplayTags, getPublicProfiles, type PublicProfile } from "@/lib/directory";
import { getAvailabilityStatus, readAvailability, readProfilePrices } from "@/lib/profile";
import { getActiveStories } from "@/lib/stories";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth";
import { getProfileEngagement } from "@/lib/profile-interactions";
import { ProfileEngagementActions } from "../ProfileEngagementActions";
import { ProfileReviews } from "../ProfileReviews";
import { getApprovedReviews } from "@/lib/profile-interactions";
import { getVerificationDocuments } from "@/lib/verification-documents";

export const dynamic = "force-dynamic";

type ProfilePageProps = { params: Promise<{ slug: string }> };

function profileTypeLabel(type: PublicProfile["type"]) {
  return type === "escort" ? "Escort" : type === "agency" ? "Agencia" : "Arriendo";
}

function profileSeoTitle(profile: PublicProfile) {
  if (profile.type === "escort") return `${profile.displayName}, escort en ${profile.city}`;
  if (profile.type === "agency") return `${profile.displayName}, agencia de escorts en ${profile.city}`;
  return `${profile.displayName}, arriendo para escorts en ${profile.city}`;
}

function profileSeoDescription(profile: PublicProfile) {
  const summary = profile.shortDescription.trim().replace(/\s+/g, " ");
  const type = profile.type === "escort" ? "escort" : profile.type === "agency" ? "agencia de escorts" : "arriendo para escorts";
  return `${profile.displayName}: ${type} en ${profile.city}, ${profile.region}.${summary ? ` ${summary}` : ""}`.slice(0, 160);
}

function phoneDigits(value: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function safeExternalUrl(value: string | undefined, allowedHost?: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!/^https?:$/.test(url.protocol)) return null;
    if (allowedHost && !(url.hostname === allowedHost || url.hostname.endsWith(`.${allowedHost}`))) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function contactLinks(profile: PublicProfile) {
  const whatsappNumber = phoneDigits(profile.contactWhatsapp);
  const callNumber = phoneDigits(profile.details.contactPhone) || whatsappNumber;
  const telegramUsername = (profile.contactTelegram ?? "").replace(/^@/, "");
  const message = encodeURIComponent(`Hola ${profile.displayName}, vi tu perfil en Chile3X y quisiera consultar disponibilidad.`);
  return {
    whatsapp: whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${message}` : null,
    call: callNumber ? `tel:${callNumber}` : null,
    telegram: /^[A-Za-z0-9_]{5,32}$/.test(telegramUsername) ? `https://t.me/${telegramUsername}` : null,
    email: profile.details.contactEmail ? `mailto:${profile.details.contactEmail}` : null,
    instagram: safeExternalUrl(profile.details.metadata.instagram_url, "instagram.com"),
    arsmate: safeExternalUrl(profile.details.metadata.arsmate_url, "arsmate.com"),
  };
}

function serviceFilterPath(profile: PublicProfile, kind: "included" | "additional", service: string) {
  const destination = profile.type === "escort" ? "/escorts" : profile.type === "agency" ? "/agencias" : "/arriendos";
  const params = new URLSearchParams({ ciudad: profile.city, [kind === "included" ? "incluido" : "adicional"]: service });
  return `${destination}?${params.toString()}`;
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
  const coverImage = profile.media.find((media) => media.mediaType === "image" && media.isProfilePhoto) ?? profile.media.find((media) => media.mediaType === "image");
  const socialImage = coverImage?.url ?? "/chile3x-social-card.png";
  return {
    title: profileSeoTitle(profile),
    description: profileSeoDescription(profile),
    alternates: { canonical: `/perfil/${profile.slug}` },
    openGraph: { title: profileSeoTitle(profile), description: profileSeoDescription(profile), url: `/perfil/${profile.slug}`, locale: "es_CL", type: "profile", images: [{ url: socialImage, alt: `${profile.displayName}, ${profile.city}` }] },
    twitter: { card: "summary_large_image", title: profileSeoTitle(profile), description: profileSeoDescription(profile), images: [socialImage] },
    robots: profile.isDemo ? { index: false, follow: false } : undefined,
  };
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params;
  const [admin, viewer] = await Promise.all([getCurrentAdmin(), getCurrentUser()]);
  const profiles = await getPublicProfiles({ includeUnapproved: Boolean(admin) });
  const profile = profiles.find((item) => item.slug === slug);
  if (!profile) notFound();
  const isAdminPreview = Boolean(admin) && profile.status !== "approved";
  const agencyProfiles = profiles.filter((item) => profile.agencyIds.includes(item.id));
  const agencyMembers = profiles.filter((item) => profile.memberIds.includes(item.id));
  const facts = metadataFacts(profile).filter((item): item is [string, string] => Boolean(item[1]));
  const tags = getProfileDisplayTags(profile);
  const location = [profile.comuna, profile.city, profile.region].filter(Boolean).join(", ");
  const schema = { "@context": "https://schema.org", "@type": profile.type === "agency" ? "Organization" : profile.type === "rental" ? "Accommodation" : "Person", name: profile.displayName, description: profileSeoDescription(profile), address: { "@type": "PostalAddress", addressLocality: profile.city, addressRegion: profile.region, addressCountry: "CL" } };
  const contacts = contactLinks(profile);
  const contactButtons = [
    ["whatsapp", contacts.whatsapp, "WhatsApp", "contact-whatsapp"],
    ["telegram", contacts.telegram, "Telegram", "contact-telegram"],
    ["call", contacts.call, "Llamar", "contact-call"],
    ["email", contacts.email, "Correo", "contact-email"],
  ] as const;
  const socialButtons = [
    ["instagram", contacts.instagram, "Instagram", "contact-instagram"],
    ["arsmate", contacts.arsmate, "Arsmate", "contact-arsmate"],
  ] as const;
  const prices = readProfilePrices(profile.details).map((price) => ({
    ...price,
    label: profile.type === "rental" && price.label === "Tarifa informada" ? "Valor mensual" : price.label,
  }));
  const availability = readAvailability(profile.details.metadata.availability);
  const availabilityStatus = getAvailabilityStatus(availability);
  const [stories, approvedReviews, verificationDocuments] = await Promise.all([getActiveStories({ profileId: profile.id }), getApprovedReviews(profile.id), admin && profile.type === "escort" ? getVerificationDocuments(profile.id) : Promise.resolve([])]);
  const coverImage = profile.media.find((media) => media.mediaType === "image" && media.isProfilePhoto) ?? profile.media.find((media) => media.mediaType === "image");
  const engagement = profile.status === "approved" && !profile.isDemo
    ? await getProfileEngagement(profile.id, viewer?.id)
    : null;

  return (
    <DirectoryShell>
      {profile.status === "approved" && !profile.isDemo && <ProfileViewTracker profileId={profile.id} />}
      {profile.status === "approved" && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />}
      {admin && <section className="admin-profile-review-bar"><div><p>{isAdminPreview ? "VISTA DE MODERACIÓN" : "ADMINISTRACIÓN DEL AVISO"}</p><h2>{isAdminPreview ? "Este aviso no es público todavía" : "Gestiona este aviso publicado"}</h2><span>Revísalo como lo ve el público y actualiza su estado, verificación o prioridad en el inicio. Los datos sensibles no se almacenan en el portal.</span></div><form action={`/api/admin/profiles/${profile.id}/status`} method="post" className="admin-profile-review-form"><input type="hidden" name="return_to" value={`/perfil/${profile.slug}`} /><label>Publicación<select name="status" defaultValue={profile.status}><option value="draft">Borrador</option><option value="pending">En revisión</option><option value="approved">Aprobar y publicar</option><option value="paused">Pausado</option><option value="rejected">Requiere cambios</option><option value="expired">Vencido</option></select></label><label>Verificación<select name="verification_status" defaultValue={profile.verificationStatus}><option value="unreviewed">Sin revisar</option><option value="in_review">En verificación</option><option value="reviewed">Comprobado</option></select></label><label>Revisión médica<select name="health_review_status" defaultValue={profile.healthReviewStatus}><option value="not_requested">No solicitada</option><option value="in_review">En revisión</option><option value="reviewed">Revisada</option></select></label><label className="admin-featured-toggle"><input name="is_featured" type="checkbox" defaultChecked={profile.isFeatured} />Destacar en el inicio</label><button className="button button-primary" type="submit">Guardar decisión</button></form></section>}
      {admin && verificationDocuments.length > 0 && <section className="admin-private-documents"><strong>Documentos privados de verificación</strong>{verificationDocuments.map((document) => <a key={document.kind} href={`/api/perfiles/${profile.id}/documentos/${document.kind}`}>{document.kind === "identity" ? "Descargar carnet" : "Descargar examen médico"}</a>)}</section>}
      <section className="profile-page-shell">
        <div className={`profile-page-visual${coverImage ? " has-image" : ""}`}>{coverImage ? <Image className="profile-page-cover" src={coverImage.url} alt={coverImage.altText ?? `Foto de ${profile.displayName}`} fill priority unoptimized sizes="(max-width: 900px) 100vw, 45vw" /> : <span>{profile.displayName.slice(0, 1)}</span>}{stories.length > 0 && <span className="profile-story-photo-marker" aria-hidden="true" />}{profile.isDemo && <p>PERFIL DE DEMOSTRACIÓN</p>}</div>
        <div className="profile-page-summary">
          <p className="eyebrow">{profileTypeLabel(profile.type).toUpperCase()} · {profile.city.toUpperCase()}</p>
          <h1>{profile.displayName} {profile.verificationStatus === "reviewed" && profile.type === "escort" && <span className="verified-sticker" title="Perfil comprobado">✓</span>}</h1>
          <p className="profile-page-location"><Link href={getCityPath(profile.city)}>{location}</Link></p>
          <div className="public-tag-row">{tags.map((tag) => <span key={tag} className={`public-tag ${tag.toLowerCase().replaceAll(" ", "-")}`}>{tag}</span>)}</div>
          {stories.length > 0 && <ProfileStoryTrigger stories={stories} />}
          <p className="profile-page-description">{profile.description}</p>
          {prices.length > 0 && <section className="profile-price-panel"><p className="eyebrow">VALORES REFERENCIALES</p><div>{prices.map((price) => <article key={price.label}><span>{price.label}</span><strong>${price.amount.toLocaleString("es-CL")} {price.currency}</strong></article>)}</div></section>}
          {profile.isDemo ? <p className="profile-demo-contact-note">Este es un perfil de demostración: sus medios de contacto están desactivados.</p> : (contactButtons.some(([, href]) => href) || socialButtons.some(([, href]) => href)) && <section className="profile-contact-box">
            <div className="profile-contact-heading"><p className="eyebrow">CONTACTO</p><h2>Habla directamente con {profile.displayName}</h2></div>
            {contactButtons.some(([, href]) => href) && <div className="profile-contact-group"><span>Contacto directo</span><div className="profile-contact-actions">{contactButtons.map(([key, href, label, className]) => href && <a key={key} className={`button ${className}`} href={href} target={key === "call" || key === "email" ? undefined : "_blank"} rel={key === "call" || key === "email" ? undefined : "noreferrer"} aria-label={label} title={label}><PortalContactIcon kind={key} /><span className="sr-only">{label}</span></a>)}</div></div>}
            {socialButtons.some(([, href]) => href) && <div className="profile-contact-group"><span>Redes y plataformas</span><div className="profile-contact-actions">{socialButtons.map(([key, href, label, className]) => href && <a key={key} className={`button ${className}`} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}><PortalContactIcon kind={key} /><span className="sr-only">{label}</span></a>)}</div></div>}
          </section>}
          {engagement && <ProfileEngagementActions profileId={profile.id} profileSlug={profile.slug} signedIn={Boolean(viewer)} initialEngagement={engagement} />}
        </div>
      </section>
      {profile.media.some((media) => media.mediaType === "image" && !media.isProfilePhoto) && <section className="profile-media-gallery" aria-label={`Fotos de ${profile.displayName}`}>
        <div><p className="eyebrow">GALERÍA</p><h2>Fotos</h2><p>Material publicado después de revisión del equipo Chile3X.</p></div>
        <div className="profile-media-grid">{profile.media.filter((media) => media.mediaType === "image" && !media.isProfilePhoto).map((media, index) => <figure key={media.id}><Image src={media.url} alt={media.altText ?? `Foto ${index + 1} de ${profile.displayName}`} fill unoptimized sizes="(max-width: 620px) 100vw, (max-width: 900px) 50vw, 33vw" /></figure>)}</div>
      </section>}
      {profile.media.some((media) => media.mediaType === "video") && <section className="profile-media-gallery profile-video-gallery" aria-label={`Videos de ${profile.displayName}`}><div><p className="eyebrow">VIDEOS</p><h2>Videos cortos</h2><p>Material publicado después de revisión del equipo Chile3X.</p></div><div className="profile-video-grid">{profile.media.filter((media) => media.mediaType === "video").map((media, index) => <figure key={media.id}><video controls preload="metadata" playsInline aria-label={`Video ${index + 1} de ${profile.displayName}`}><source src={media.url} type={media.contentType} />Tu navegador no puede reproducir este video.</video></figure>)}</div></section>}
      <div id="historias"><StoryRail stories={stories} profileOnly /></div>
      <section className="profile-detail-layout">
        <div className="profile-detail-main">
          {(availability.length > 0 || profile.details.schedule) && <section className="profile-detail-section availability-detail-section"><div className="availability-detail-heading"><div><h2>Disponibilidad</h2>{availabilityStatus && <p className={availabilityStatus.isOpen ? "availability-open" : "availability-closed"}>{availabilityStatus.text}</p>}</div>{availabilityStatus && <span aria-hidden="true" className={availabilityStatus.isOpen ? "availability-status-dot is-open" : "availability-status-dot"} />}</div>{availability.length > 0 ? <dl className="availability-list">{availability.map((day) => <div key={day.key}><dt>{day.label}</dt><dd>{day.opensAt} – {day.closesAt}</dd></div>)}</dl> : <p>{profile.details.schedule}</p>}</section>}
          {facts.length > 0 && <section className="profile-detail-section"><h2>{profile.type === "rental" ? "Características" : "Información del perfil"}</h2><dl className="profile-facts">{facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
          {(profile.servicesIncluded.length > 0 || profile.servicesAdditional.length > 0) && <section className="profile-detail-section service-detail-section"><h2>Servicios</h2><p className="service-filter-hint">Selecciona un servicio para ver resultados inicialmente en {profile.city}; después puedes ajustar los filtros.</p><div>{profile.servicesIncluded.length > 0 && <article><h3>Incluidos</h3><ul>{profile.servicesIncluded.map((item) => <li key={item}><Link href={serviceFilterPath(profile, "included", item)}>{item}</Link></li>)}</ul></article>}{profile.servicesAdditional.length > 0 && <article><h3>Adicionales</h3><ul>{profile.servicesAdditional.map((item) => <li key={item}><Link href={serviceFilterPath(profile, "additional", item)}>{item}</Link></li>)}</ul></article>}</div></section>}
        </div>
        <aside className="profile-detail-aside"><p className="eyebrow">UBICACIÓN</p><h2>{profile.city}</h2>{profile.details.referenceLocation && <p>{profile.details.referenceLocation}</p>}<Link className="button button-outline" href={getCityPath(profile.city)}>Ver más en {profile.city}</Link></aside>
      </section>
      {profile.type === "agency" && <section className="profile-association-section"><p className="eyebrow">PERFILES ASOCIADOS</p><h2>Escorts de {profile.displayName}</h2><p>Los perfiles se muestran aquí solo después de aceptar la invitación de la agencia.</p><div className="public-profile-grid">{agencyMembers.map((member) => <ProfileCard profile={member} key={member.id} />)}</div>{agencyMembers.length === 0 && <p className="association-empty">Esta agencia aún no tiene perfiles asociados aprobados.</p>}</section>}
      {profile.type === "escort" && agencyProfiles.length > 0 && <section className="profile-association-section compact"><p className="eyebrow">ASOCIACIONES ACEPTADAS</p><h2>Agencias relacionadas</h2><div className="public-profile-grid">{agencyProfiles.map((agency) => <ProfileCard profile={agency} key={agency.id} />)}</div></section>}
      {profile.status === "approved" && !profile.isDemo && <ProfileReviews profileId={profile.id} profileSlug={profile.slug} signedIn={Boolean(viewer)} reviews={approvedReviews} />}
    </DirectoryShell>
  );
}
