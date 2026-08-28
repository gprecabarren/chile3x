import Image from "next/image";
import { and, count, desc, eq, or } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { exclusiveContentCollections, exclusiveContentMedia, profileMedia, profiles, users } from "@/db/schema";
import { getCurrentAdmin, safeAdminReturnTo } from "@/lib/auth";
import { formatMediaBytes, getMediaQuotaState, getMediaUsage } from "@/lib/media";
import { profilePublicPath } from "@/lib/profile";
import { AdminPageHeading, AdminShell } from "../_components";
import { AdminPagination, pageHref, readAdminPage } from "../pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;
const moderationStatuses = ["pending", "approved", "rejected"] as const;

const notices: Record<string, string> = {
  approved: "El archivo fue aprobado y ya puede verse si su anuncio está publicado.",
  unapproved: "La aprobación fue cancelada. El archivo volvió a revisión privada.",
  deleted: "El archivo se eliminó de R2 y del registro correspondiente.",
  missing: "El archivo ya no existe.",
  error: "No se pudo actualizar el archivo.",
};

type SearchParams = {
  notice?: string;
  perfil?: string;
  estado?: string;
  tipo?: string;
  page?: string;
  return_to?: string;
};

function readStatus(value: string | undefined) {
  return moderationStatuses.includes(value as (typeof moderationStatuses)[number]) ? value as (typeof moderationStatuses)[number] : "";
}

function moderationLabel(status: string) {
  return status === "approved" ? "Aprobado" : status === "pending" ? "En revisión" : "Rechazado";
}

function listingStatusLabel(status: string) {
  return ({ approved: "Publicado", draft: "Borrador", expired: "Vencido", paused: "Pausado", pending: "En revisión", rejected: "Requiere cambios" } as Record<string, string>)[status] ?? status;
}

function mediaHref(params: URLSearchParams, page = 1) {
  return pageHref("/admin/medios", params, page);
}

function PublicMediaCard({ media, profileName, returnTo }: {
  media: typeof profileMedia.$inferSelect;
  profileName: string;
  returnTo: string;
}) {
  return <article className={`admin-media-card is-${media.moderationStatus}`}>
    <div className="admin-media-preview">
      {media.mediaType === "image"
        ? <Image src={`/media/${media.id}`} alt={`Archivo enviado para ${profileName}`} fill unoptimized sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 300px" />
        : <video controls preload="metadata"><source src={`/media/${media.id}`} type={media.contentType} /></video>}
    </div>
    <div>
      <span className={`media-status media-status-${media.moderationStatus}`}>{moderationLabel(media.moderationStatus)}</span>
      <p>{media.isProfilePhoto ? "Foto de perfil" : media.mediaType === "video" ? "Video de galería" : "Foto de galería"} · {formatMediaBytes(media.byteSize)}</p>
      <form action={`/api/admin/media/${media.id}`} method="post">
        <input type="hidden" name="return_to" value={returnTo} />
        {media.moderationStatus === "approved"
          ? <button className="button button-outline" type="submit" name="action" value="unapprove">Cancelar aprobación</button>
          : <button className="button button-primary" type="submit" name="action" value="approve">Aprobar archivo</button>}
        <button className="button button-outline" type="submit" name="action" value="delete">Eliminar</button>
      </form>
    </div>
  </article>;
}

function ExclusiveMediaCard({ media, ownerUsername, returnTo }: {
  media: typeof exclusiveContentMedia.$inferSelect;
  ownerUsername: string | null;
  returnTo: string;
}) {
  return <article className={`admin-media-card is-${media.moderationStatus}`}>
    <div className="admin-media-preview">
      {media.mediaType === "image"
        ? <Image src={`/contenido/${media.id}`} alt={`Contenido exclusivo de @${ownerUsername ?? "usuario"}`} fill unoptimized sizes="(max-width: 620px) 100vw, (max-width: 980px) 50vw, 300px" />
        : <video controls preload="metadata"><source src={`/contenido/${media.id}`} type={media.contentType} /></video>}
    </div>
    <div>
      <span className={`media-status media-status-${media.moderationStatus}`}>{moderationLabel(media.moderationStatus)}</span>
      <p>Contenido exclusivo · {media.mediaType === "video" ? "Video" : "Foto"} · {formatMediaBytes(media.byteSize)}</p>
      <form action={`/api/admin/contenido/${media.id}`} method="post">
        <input type="hidden" name="return_to" value={returnTo} />
        {media.moderationStatus === "approved"
          ? <button className="button button-outline" type="submit" name="action" value="unapprove">Cancelar aprobación</button>
          : <button className="button button-primary" type="submit" name="action" value="approve">Aprobar archivo</button>}
        <button className="button button-outline" type="submit" name="action" value="delete">Eliminar</button>
      </form>
    </div>
  </article>;
}

export default async function AdminMediaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/medios");

  const [db, params, usage] = await Promise.all([getDb(), searchParams, getMediaUsage()]);
  const selectedProfileId = (params.perfil ?? "").trim().slice(0, 120);
  const status = readStatus(params.estado);
  const view = params.tipo === "exclusive" ? "exclusive" : "public";
  const requestedReturnTo = params.return_to ?? "";
  const backHref = requestedReturnTo.startsWith("/admin/") ? safeAdminReturnTo(requestedReturnTo) : "/admin";
  const requestedPage = readAdminPage(params.page);

  const listParams = new URLSearchParams();
  if (selectedProfileId) listParams.set("perfil", selectedProfileId);
  if (status) listParams.set("estado", status);
  if (view === "exclusive") listParams.set("tipo", "exclusive");
  if (requestedReturnTo.startsWith("/admin/")) listParams.set("return_to", backHref);

  const publicScope = selectedProfileId && status
    ? and(or(eq(profileMedia.visibility, "public"), eq(profileMedia.isProfilePhoto, true)), eq(profileMedia.profileId, selectedProfileId), eq(profileMedia.moderationStatus, status))
    : selectedProfileId
      ? and(or(eq(profileMedia.visibility, "public"), eq(profileMedia.isProfilePhoto, true)), eq(profileMedia.profileId, selectedProfileId))
      : status
        ? and(or(eq(profileMedia.visibility, "public"), eq(profileMedia.isProfilePhoto, true)), eq(profileMedia.moderationStatus, status))
        : or(eq(profileMedia.visibility, "public"), eq(profileMedia.isProfilePhoto, true));
  const exclusiveScope = selectedProfileId && status
    ? and(eq(exclusiveContentCollections.profileId, selectedProfileId), eq(exclusiveContentMedia.moderationStatus, status))
    : selectedProfileId
      ? eq(exclusiveContentCollections.profileId, selectedProfileId)
      : status
        ? eq(exclusiveContentMedia.moderationStatus, status)
        : undefined;

  const [pendingPublicRows, pendingExclusiveRows, publicRows, exclusiveRows] = await Promise.all([
    db.select({ total: count() }).from(profileMedia).where(eq(profileMedia.moderationStatus, "pending")),
    db.select({ total: count() }).from(exclusiveContentMedia).where(eq(exclusiveContentMedia.moderationStatus, "pending")),
    db.select({
      media: profileMedia,
      profileId: profiles.id,
      profileName: profiles.displayName,
      profileSlug: profiles.slug,
      profileHandle: profiles.handle,
      profileStatus: profiles.status,
      ownerEmail: users.email,
    }).from(profileMedia)
      .innerJoin(profiles, eq(profileMedia.profileId, profiles.id))
      .innerJoin(users, eq(profiles.ownerId, users.id))
      .where(publicScope)
      .orderBy(desc(profileMedia.createdAt)),
    db.select({
      media: exclusiveContentMedia,
      collectionId: exclusiveContentCollections.id,
      linkedProfileId: exclusiveContentCollections.profileId,
      linkedProfileName: profiles.displayName,
      linkedProfileSlug: profiles.slug,
      linkedProfileHandle: profiles.handle,
      ownerId: users.id,
      ownerUsername: users.username,
      ownerName: users.displayName,
    }).from(exclusiveContentMedia)
      .innerJoin(exclusiveContentCollections, eq(exclusiveContentMedia.collectionId, exclusiveContentCollections.id))
      .innerJoin(users, eq(exclusiveContentCollections.ownerId, users.id))
      .leftJoin(profiles, eq(exclusiveContentCollections.profileId, profiles.id))
      .where(exclusiveScope)
      .orderBy(desc(exclusiveContentMedia.createdAt)),
  ]);

  type PublicRow = (typeof publicRows)[number];
  type ExclusiveRow = (typeof exclusiveRows)[number];
  const publicGroups = new Map<string, {
    id: string;
    name: string;
    slug: string;
    handle: string | null;
    status: string;
    ownerEmail: string;
    items: PublicRow[];
  }>();
  for (const row of publicRows) {
    const group = publicGroups.get(row.profileId);
    if (group) group.items.push(row);
    else publicGroups.set(row.profileId, { id: row.profileId, name: row.profileName, slug: row.profileSlug, handle: row.profileHandle, status: row.profileStatus, ownerEmail: row.ownerEmail, items: [row] });
  }

  const exclusiveGroups = new Map<string, {
    id: string;
    ownerId: string;
    ownerUsername: string | null;
    ownerName: string | null;
    linkedProfileId: string | null;
    linkedProfileName: string | null;
    linkedProfileSlug: string | null;
    linkedProfileHandle: string | null;
    items: ExclusiveRow[];
  }>();
  for (const row of exclusiveRows) {
    const group = exclusiveGroups.get(row.collectionId);
    if (group) group.items.push(row);
    else exclusiveGroups.set(row.collectionId, {
      id: row.collectionId,
      ownerId: row.ownerId,
      ownerUsername: row.ownerUsername,
      ownerName: row.ownerName,
      linkedProfileId: row.linkedProfileId,
      linkedProfileName: row.linkedProfileName,
      linkedProfileSlug: row.linkedProfileSlug,
      linkedProfileHandle: row.linkedProfileHandle,
      items: [row],
    });
  }

  const publicGroupList = [...publicGroups.values()];
  const exclusiveGroupList = [...exclusiveGroups.values()];
  const total = view === "exclusive" ? exclusiveGroupList.length : publicGroupList.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const currentHref = mediaHref(listParams, page);
  const publicPageGroups = publicGroupList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const exclusivePageGroups = exclusiveGroupList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const quota = getMediaQuotaState(usage.bytes);
  const pendingPublic = Number(pendingPublicRows[0]?.total ?? 0);
  const pendingExclusive = Number(pendingExclusiveRows[0]?.total ?? 0);
  const publicTabParams = new URLSearchParams(listParams);
  publicTabParams.delete("tipo");
  const exclusiveTabParams = new URLSearchParams(listParams);
  exclusiveTabParams.set("tipo", "exclusive");
  const allPublicParams = new URLSearchParams(publicTabParams);
  allPublicParams.delete("perfil");

  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading
      eyebrow="MODERACIÓN DE MEDIOS"
      title={view === "exclusive" ? "Contenido exclusivo por cuenta" : selectedProfileId ? "Galería del anuncio" : "Galerías públicas por anuncio"}
      description={view === "exclusive" ? "Cada biblioteca pertenece a una cuenta y permanece disponible aunque el anuncio vinculado se pause o elimine." : "Cada grupo corresponde a un anuncio. La foto de perfil y la galería pública se revisan aquí sin mezclarse con el contenido exclusivo de las cuentas."}
      backHref={backHref}
    />
    {params.notice && notices[params.notice] && <p className="admin-success" role="status">{notices[params.notice]}</p>}
    <nav className="admin-media-tabs" aria-label="Tipo de medios a moderar">
      <Link className={view === "public" ? "is-active" : undefined} href={mediaHref(publicTabParams)}>Galerías públicas{pendingPublic > 0 && <b>{pendingPublic}</b>}</Link>
      <Link className={view === "exclusive" ? "is-active" : undefined} href={mediaHref(exclusiveTabParams)}>Contenido exclusivo{pendingExclusive > 0 && <b>{pendingExclusive}</b>}</Link>
      {selectedProfileId && <Link href={mediaHref(allPublicParams)}>Ver todos los anuncios</Link>}
    </nav>
    <section className={`admin-media-quota admin-media-quota-${quota.level}`}>
      <div><p>ALMACENAMIENTO R2</p><h2>{formatMediaBytes(usage.bytes)} registrados</h2><span>{usage.files} archivos · margen interno configurado: 8 GB</span></div>
      <strong>{pendingPublic + pendingExclusive} pendientes</strong>
      <small>{quota.message}</small>
    </section>
    {total === 0
      ? <section className="admin-empty"><h2>{selectedProfileId ? "No hay archivos que coincidan con este anuncio" : view === "exclusive" ? "No hay contenido exclusivo cargado" : "No hay galerías públicas cargadas"}</h2><p>{view === "exclusive" ? "Cuando una cuenta cargue contenido exclusivo, aparecerá en su biblioteca privada sin mezclarse con las galerías de anuncios." : "Cuando un anunciante suba una foto o un video público, aparecerá agrupado bajo su anuncio."}</p></section>
      : <section className="admin-media-profile-list" aria-label={view === "exclusive" ? "Bibliotecas exclusivas" : "Galerías públicas"}>
        {view === "public" ? publicPageGroups.map((group) => {
          const profilePhoto = group.items.filter((item) => item.media.isProfilePhoto);
          const gallery = group.items.filter((item) => !item.media.isProfilePhoto);
          const pending = group.items.filter((item) => item.media.moderationStatus === "pending").length;
          const profileHref = profilePublicPath({ handle: group.handle, slug: group.slug });
          return <section className="admin-media-profile-group" key={group.id}>
            <header><div><p className="eyebrow">ANUNCIO</p><h2>{group.name}</h2><span><a href={`mailto:${group.ownerEmail}`}>{group.ownerEmail}</a> · {listingStatusLabel(group.status)} · {group.items.length} archivo{group.items.length === 1 ? "" : "s"}{pending > 0 ? ` · ${pending} pendiente${pending === 1 ? "" : "s"}` : ""}</span></div><div><Link className="button button-public-preview" href={profileHref} target="_blank">Ver anuncio público</Link><Link className="button button-outline" href={`/admin/perfiles?q=${encodeURIComponent(group.name)}&return_to=${encodeURIComponent(currentHref)}`}>Abrir moderación</Link></div></header>
            {profilePhoto.length > 0 && <section><h3>Foto de perfil</h3><div className="admin-media-grid">{profilePhoto.map((item) => <PublicMediaCard key={item.media.id} media={item.media} profileName={group.name} returnTo={currentHref} />)}</div></section>}
            {gallery.length > 0 && <section><h3>Galería pública</h3><div className="admin-media-grid">{gallery.map((item) => <PublicMediaCard key={item.media.id} media={item.media} profileName={group.name} returnTo={currentHref} />)}</div></section>}
          </section>;
        }) : exclusivePageGroups.map((group) => {
          const pending = group.items.filter((item) => item.media.moderationStatus === "pending").length;
          const accountHref = `/admin/cuentas/${encodeURIComponent(group.ownerId)}?return_to=${encodeURIComponent(currentHref)}`;
          const profileHref = group.linkedProfileSlug ? profilePublicPath({ handle: group.linkedProfileHandle, slug: group.linkedProfileSlug }) : null;
          return <section className="admin-media-profile-group exclusive-account-media-group" key={group.id}>
            <header><div><p className="eyebrow">BIBLIOTECA PRIVADA DE CUENTA</p><h2>@{group.ownerUsername ?? group.ownerName ?? "usuario"}</h2><span>{group.linkedProfileName ? `Vinculada al anuncio ${group.linkedProfileName}` : "Sin anuncio vinculado"} · {group.items.length} archivo{group.items.length === 1 ? "" : "s"}{pending > 0 ? ` · ${pending} pendiente${pending === 1 ? "" : "s"}` : ""}</span></div><div><Link className="button button-outline" href={accountHref}>Abrir cuenta</Link>{profileHref && <Link className="button button-public-preview" href={profileHref} target="_blank">Ver anuncio vinculado</Link>}</div></header>
            <section><h3>Contenido exclusivo</h3><p className="admin-media-group-hint">Este contenido pertenece a la cuenta, no se publica libremente y mantiene los accesos autorizados aunque se pause o elimine el anuncio asociado.</p><div className="admin-media-grid">{group.items.map((item) => <ExclusiveMediaCard key={item.media.id} media={item.media} ownerUsername={group.ownerUsername} returnTo={currentHref} />)}</div></section>
          </section>;
        })}
      </section>}
    <AdminPagination pathname="/admin/medios" params={listParams} currentPage={page} totalItems={total} pageSize={PAGE_SIZE} label={view === "exclusive" ? "Bibliotecas" : "Anuncios"} />
  </div></AdminShell>;
}
