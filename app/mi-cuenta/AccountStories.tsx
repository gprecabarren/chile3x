import { ActionButton } from "@/app/ActionButton";
import Link from "@/app/NavigationLink";
import { PortalWhatsappLink } from "@/app/PortalWhatsappLink";
import { PortalContactIcon } from "@/app/directorio/_components";
import { ActionIcon } from "@/app/ActionIcon";
import type { AccountStoryProfile } from "@/lib/account-stories";
import { accountStoryUnavailableReason, availableStoryProfilesFirst, canPublishAccountStories } from "@/lib/account-stories-policy";
import { publicProfileTypeLabel } from "@/lib/profile-content-category";
import { profilePublicPath } from "@/lib/profile";
import { storyUploadLabel } from "@/lib/story-order";

export function StorySupportLink() {
  return <PortalWhatsappLink className="button button-outline story-support-link" placement="header" openHelpPanel href="/contacto"><PortalContactIcon kind="whatsapp" /><span>Contactar a soporte</span></PortalWhatsappLink>;
}

function StoryProfileCard({ profile, chooser = false }: { profile: AccountStoryProfile; chooser?: boolean }) {
  const available = canPublishAccountStories(profile);
  const href = `/mi-cuenta/${profile.id}/historias`;
  return <article className={`account-story-card${available ? "" : " is-unavailable"}`}>
    <div className="account-story-card-heading"><span className="account-story-avatar" aria-hidden="true">{profile.displayName.slice(0, 1).toUpperCase()}</span><div><span className="account-story-category">{publicProfileTypeLabel(profile)} · {profile.city}</span><h3>{profile.displayName}</h3>{profile.handle && <small>@{profile.handle}</small>}</div></div>
    <ul className="account-story-counts" aria-label={`Historias activas de ${profile.displayName}`}><li><ActionIcon name="text" />{profile.stories.text} {profile.stories.text === 1 ? "texto" : "textos"}</li><li><ActionIcon name="image" />{profile.stories.image} {profile.stories.image === 1 ? "foto" : "fotos"}</li><li><ActionIcon name="video" />{profile.stories.video} {profile.stories.video === 1 ? "video" : "videos"}</li></ul>
    {profile.stories.latest && <p className="account-story-date">Última publicación: <time>{storyUploadLabel(profile.stories.latest)}</time> · hora de Chile</p>}
    {!available && <p className="account-story-unavailable"><ActionIcon name="lock" />{accountStoryUnavailableReason(profile)}</p>}
    <div className="account-story-actions">
      {available ? <Link className="button button-primary" href={href}>{chooser ? "Subir historias" : "Ver y administrar historias"}</Link> : <><ActionButton className="button button-outline" type="button" disabled><ActionIcon name="lock" />Subir historias no disponible</ActionButton>{profile.stories.total > 0 && <Link className="button button-outline" href={href}>Administrar historias activas</Link>}</>}
      <Link className="button button-public-preview" href={profilePublicPath(profile)} target="_blank" rel="noopener noreferrer">{available ? "Ver anuncio" : "Previsualizar anuncio"}</Link>
      <Link className="button button-outline" href={`/mi-cuenta/${profile.id}/editar`}>Editar anuncio</Link>
      {!available && <StorySupportLink />}
    </div>
  </article>;
}

export function AccountStoryChoices({ profiles }: { profiles: AccountStoryProfile[] }) {
  const sorted = availableStoryProfilesFirst(profiles);
  const available = sorted.filter(canPublishAccountStories);
  const unavailable = sorted.filter(profile => !canPublishAccountStories(profile));
  if (!profiles.length) return <section className="account-stories-empty"><ActionIcon name="stories" /><h2>Primero necesitas un anuncio</h2><p>Crea tu anuncio y envíalo a revisión. Cuando esté aprobado y visible podrás publicar historias de texto, foto o video.</p><div className="account-story-actions"><Link className="button button-primary" href="/mi-cuenta/nuevo-perfil">Crear anuncio</Link><StorySupportLink /></div></section>;
  return <div className="account-story-choices">{available.length > 0 && <section aria-labelledby="story-available-title"><h2 id="story-available-title">Disponibles para subir historias <small>({available.length})</small></h2><div className="account-stories-grid">{available.map(profile => <StoryProfileCard key={profile.id} profile={profile} chooser />)}</div></section>}{unavailable.length > 0 && <section aria-labelledby="story-unavailable-title"><h2 id="story-unavailable-title">No disponibles por ahora <small>({unavailable.length})</small></h2><p>Estos anuncios conservan sus accesos de edición y vista previa, pero no pueden publicar historias.</p><div className="account-stories-grid">{unavailable.map(profile => <StoryProfileCard key={profile.id} profile={profile} chooser />)}</div></section>}</div>;
}

export function AccountStoriesOverview({ profiles }: { profiles: AccountStoryProfile[] }) {
  const active = availableStoryProfilesFirst(profiles.filter(profile => profile.stories.total > 0));
  return <section className="account-overview account-stories-overview" aria-labelledby="account-stories-title"><header className="account-stories-overview-heading"><div><p className="eyebrow">TEXTO · FOTO · VIDEO</p><h2 id="account-stories-title">Tus historias</h2><p>Revisa las historias activas de todos tus anuncios. Cada historia dura 24 horas.</p></div><Link className="button button-primary" href="/mi-cuenta/historias">Subir historias</Link></header>{active.length ? <div className="account-stories-grid">{active.map(profile => <StoryProfileCard key={profile.id} profile={profile} />)}</div> : <p className="account-stories-empty-note">No tienes historias activas. Elige uno de tus anuncios para publicar la primera.</p>}</section>;
}
