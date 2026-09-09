import Image from "next/image";
import { and, count, countDistinct, desc, eq, inArray, max, or, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { exclusiveContentCollections, exclusiveContentMedia, profileMedia, profiles, users } from "@/db/schema";
import { getCurrentAdmin, safeAdminReturnTo } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
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
  cuenta?: string;
  q?: string;
  estado?: string;
  archivo?: string;
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
  if (!adminHasCapability(admin, "media.moderate")) redirect("/admin/acceso-denegado?reason=permission");

  const [db, params, usage] = await Promise.all([getDb(), searchParams, getMediaUsage()]);
  const selectedProfileId = (params.perfil ?? "").trim().slice(0, 120);
  const selectedOwnerId = (params.cuenta ?? "").trim().slice(0, 120);
  const accountQuery = (params.q ?? "").trim().toLocaleLowerCase("es-CL");
  const status = readStatus(params.estado);
  const fileType = params.archivo === "image" || params.archivo === "video" ? params.archivo : "";
  const view = params.tipo === "exclusive" ? "exclusive" : params.tipo === "accounts" ? "accounts" : "public";
  const requestedReturnTo = params.return_to ?? "";
  const backHref = requestedReturnTo.startsWith("/admin/") ? safeAdminReturnTo(requestedReturnTo) : "/admin";
  const requestedPage = readAdminPage(params.page);

  const listParams = new URLSearchParams();
  if (selectedProfileId) listParams.set("perfil", selectedProfileId);
  if (selectedOwnerId && view === "accounts") listParams.set("cuenta", selectedOwnerId);
  if (accountQuery && view === "accounts") listParams.set("q", params.q?.trim() ?? "");
  if (status) listParams.set("estado", status);
  if (fileType) listParams.set("archivo", fileType);
  if (view !== "public") listParams.set("tipo", view);
  if (requestedReturnTo.startsWith("/admin/")) listParams.set("return_to", backHref);

  const publicMediaScope = and(
    or(eq(profileMedia.visibility, "public"), eq(profileMedia.isProfilePhoto, true)),
    status ? eq(profileMedia.moderationStatus, status) : undefined,
    fileType ? eq(profileMedia.mediaType, fileType) : undefined,
  );
  const exclusiveMediaScope = and(
    status ? eq(exclusiveContentMedia.moderationStatus, status) : undefined,
    fileType ? eq(exclusiveContentMedia.mediaType, fileType) : undefined,
  );
  const [pendingPublicRows, pendingExclusiveRows] = await Promise.all([
    db.select({ total: count() }).from(profileMedia).where(and(or(eq(profileMedia.visibility, "public"), eq(profileMedia.isProfilePhoto, true)), eq(profileMedia.moderationStatus, "pending"))),
    db.select({ total: count() }).from(exclusiveContentMedia).where(eq(exclusiveContentMedia.moderationStatus, "pending")),
  ]);

  type PublicRow = {
    media: typeof profileMedia.$inferSelect;
    profileId: string;
    profileName: string;
    profileSlug: string;
    profileHandle: string | null;
    profileStatus: string;
    ownerId: string;
    ownerEmail: string;
    ownerUsername: string | null;
  };
  type ExclusiveRow = {
    media: typeof exclusiveContentMedia.$inferSelect;
    collectionId: string;
    linkedProfileId: string | null;
    linkedProfileName: string | null;
    linkedProfileSlug: string | null;
    linkedProfileHandle: string | null;
    ownerId: string;
    ownerEmail: string;
    ownerUsername: string | null;
    ownerName: string | null;
  };

  let publicRows: PublicRow[] = [];
  let exclusiveRows: ExclusiveRow[] = [];
  let publicOrder: string[] = [];
  let exclusiveOrder: string[] = [];
  let accountOrder: string[] = [];
  let total = 0;
  let page = 1;

  const publicSelection = {
      media: profileMedia,
      profileId: profiles.id,
      profileName: profiles.displayName,
      profileSlug: profiles.slug,
      profileHandle: profiles.handle,
      profileStatus: profiles.status,
      ownerId: users.id,
      ownerEmail: users.email,
      ownerUsername: users.username,
  };
  const exclusiveSelection = {
      media: exclusiveContentMedia,
      collectionId: exclusiveContentCollections.id,
      linkedProfileId: exclusiveContentCollections.profileId,
      linkedProfileName: profiles.displayName,
      linkedProfileSlug: profiles.slug,
      linkedProfileHandle: profiles.handle,
      ownerId: users.id,
      ownerEmail: users.email,
      ownerUsername: users.username,
      ownerName: users.displayName,
  };
  const pendingPublicExpression = sql<number>`sum(case when ${profileMedia.moderationStatus} = 'pending' then 1 else 0 end)`;
  const pendingExclusiveExpression = sql<number>`sum(case when ${exclusiveContentMedia.moderationStatus} = 'pending' then 1 else 0 end)`;

  if (view === "public") {
    const scope = and(publicMediaScope, selectedProfileId ? eq(profileMedia.profileId, selectedProfileId) : undefined);
    const [totalRow] = await db.select({ total: countDistinct(profileMedia.profileId) }).from(profileMedia).where(scope);
    total = Number(totalRow?.total ?? 0);
    page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
    const pageIndex = await db.select({ id: profileMedia.profileId, pending: pendingPublicExpression, latest: max(profileMedia.createdAt) })
      .from(profileMedia).where(scope).groupBy(profileMedia.profileId)
      .orderBy(desc(pendingPublicExpression), desc(max(profileMedia.createdAt)))
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
    publicOrder = pageIndex.map((entry) => entry.id);
    if (publicOrder.length) {
      publicRows = await db.select(publicSelection).from(profileMedia)
        .innerJoin(profiles, eq(profileMedia.profileId, profiles.id))
        .innerJoin(users, eq(profiles.ownerId, users.id))
        .where(and(publicMediaScope, inArray(profileMedia.profileId, publicOrder)))
        .orderBy(desc(profileMedia.createdAt));
    }
  } else if (view === "exclusive") {
    const scope = and(exclusiveMediaScope, selectedProfileId ? eq(exclusiveContentCollections.profileId, selectedProfileId) : undefined);
    const [totalRow] = await db.select({ total: countDistinct(exclusiveContentMedia.collectionId) }).from(exclusiveContentMedia)
      .innerJoin(exclusiveContentCollections, eq(exclusiveContentMedia.collectionId, exclusiveContentCollections.id)).where(scope);
    total = Number(totalRow?.total ?? 0);
    page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
    const pageIndex = await db.select({ id: exclusiveContentMedia.collectionId, pending: pendingExclusiveExpression, latest: max(exclusiveContentMedia.createdAt) })
      .from(exclusiveContentMedia).innerJoin(exclusiveContentCollections, eq(exclusiveContentMedia.collectionId, exclusiveContentCollections.id))
      .where(scope).groupBy(exclusiveContentMedia.collectionId)
      .orderBy(desc(pendingExclusiveExpression), desc(max(exclusiveContentMedia.createdAt)))
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
    exclusiveOrder = pageIndex.map((entry) => entry.id);
    if (exclusiveOrder.length) {
      exclusiveRows = await db.select(exclusiveSelection).from(exclusiveContentMedia)
        .innerJoin(exclusiveContentCollections, eq(exclusiveContentMedia.collectionId, exclusiveContentCollections.id))
        .innerJoin(users, eq(exclusiveContentCollections.ownerId, users.id))
        .leftJoin(profiles, eq(exclusiveContentCollections.profileId, profiles.id))
        .where(and(exclusiveMediaScope, inArray(exclusiveContentMedia.collectionId, exclusiveOrder)))
        .orderBy(desc(exclusiveContentMedia.createdAt));
    }
  } else {
    const accountPattern = `%${accountQuery}%`;
    const accountScope = and(
      selectedOwnerId ? eq(users.id, selectedOwnerId) : undefined,
      accountQuery ? or(
        sql<boolean>`lower(${users.email}) like ${accountPattern}`,
        sql<boolean>`lower(coalesce(${users.username}, '')) like ${accountPattern}`,
        sql<boolean>`lower(coalesce(${users.displayName}, '')) like ${accountPattern}`,
      ) : undefined,
    );
    const [publicAccounts, exclusiveAccounts] = await Promise.all([
      db.select({ id: users.id, pending: pendingPublicExpression, latest: max(profileMedia.createdAt) }).from(profileMedia)
        .innerJoin(profiles, eq(profileMedia.profileId, profiles.id)).innerJoin(users, eq(profiles.ownerId, users.id))
        .where(and(publicMediaScope, accountScope)).groupBy(users.id),
      db.select({ id: users.id, pending: pendingExclusiveExpression, latest: max(exclusiveContentMedia.createdAt) }).from(exclusiveContentMedia)
        .innerJoin(exclusiveContentCollections, eq(exclusiveContentMedia.collectionId, exclusiveContentCollections.id))
        .innerJoin(users, eq(exclusiveContentCollections.ownerId, users.id))
        .where(and(exclusiveMediaScope, accountScope)).groupBy(users.id),
    ]);
    const summaries = new Map<string, { pending: number; latest: string }>();
    for (const entry of [...publicAccounts, ...exclusiveAccounts]) {
      const current = summaries.get(entry.id);
      const latest = entry.latest ?? "";
      if (current) {
        current.pending += Number(entry.pending ?? 0);
        if (latest > current.latest) current.latest = latest;
      } else summaries.set(entry.id, { pending: Number(entry.pending ?? 0), latest });
    }
    const allAccountIds = [...summaries.entries()]
      .sort((left, right) => right[1].pending - left[1].pending || right[1].latest.localeCompare(left[1].latest))
      .map(([id]) => id);
    total = allAccountIds.length;
    page = Math.min(requestedPage, Math.max(1, Math.ceil(total / PAGE_SIZE)));
    accountOrder = allAccountIds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    if (accountOrder.length) {
      [publicRows, exclusiveRows] = await Promise.all([
        db.select(publicSelection).from(profileMedia)
          .innerJoin(profiles, eq(profileMedia.profileId, profiles.id)).innerJoin(users, eq(profiles.ownerId, users.id))
          .where(and(publicMediaScope, inArray(users.id, accountOrder))).orderBy(desc(profileMedia.createdAt)),
        db.select(exclusiveSelection).from(exclusiveContentMedia)
          .innerJoin(exclusiveContentCollections, eq(exclusiveContentMedia.collectionId, exclusiveContentCollections.id))
          .innerJoin(users, eq(exclusiveContentCollections.ownerId, users.id)).leftJoin(profiles, eq(exclusiveContentCollections.profileId, profiles.id))
          .where(and(exclusiveMediaScope, inArray(users.id, accountOrder))).orderBy(desc(exclusiveContentMedia.createdAt)),
      ]);
    }
  }

  const publicGroups = new Map<string, {
    id: string;
    name: string;
    slug: string;
    handle: string | null;
    status: string;
    ownerId: string;
    ownerEmail: string;
    ownerUsername: string | null;
    items: PublicRow[];
  }>();
  for (const row of publicRows) {
    const group = publicGroups.get(row.profileId);
    if (group) group.items.push(row);
    else publicGroups.set(row.profileId, { id: row.profileId, name: row.profileName, slug: row.profileSlug, handle: row.profileHandle, status: row.profileStatus, ownerId: row.ownerId, ownerEmail: row.ownerEmail, ownerUsername: row.ownerUsername, items: [row] });
  }

  const exclusiveGroups = new Map<string, {
    id: string;
    ownerId: string;
    ownerEmail: string;
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
      ownerEmail: row.ownerEmail,
      ownerUsername: row.ownerUsername,
      ownerName: row.ownerName,
      linkedProfileId: row.linkedProfileId,
      linkedProfileName: row.linkedProfileName,
      linkedProfileSlug: row.linkedProfileSlug,
      linkedProfileHandle: row.linkedProfileHandle,
      items: [row],
    });
  }

  const orderByIds = <T extends { id: string }>(values: T[], ids: string[]) => values.sort((left, right) => ids.indexOf(left.id) - ids.indexOf(right.id));
  const publicGroupList = orderByIds([...publicGroups.values()], view === "accounts" ? accountOrder : publicOrder);
  const exclusiveGroupList = orderByIds([...exclusiveGroups.values()], view === "accounts" ? accountOrder : exclusiveOrder);
  const accountGroups = new Map<string, {
    id: string;
    email: string;
    username: string | null;
    name: string | null;
    publicGroups: typeof publicGroupList;
    exclusiveGroups: typeof exclusiveGroupList;
  }>();
  for (const group of publicGroupList) {
    const account = accountGroups.get(group.ownerId);
    if (account) account.publicGroups.push(group);
    else accountGroups.set(group.ownerId, { id: group.ownerId, email: group.ownerEmail, username: group.ownerUsername, name: null, publicGroups: [group], exclusiveGroups: [] });
  }
  for (const group of exclusiveGroupList) {
    const account = accountGroups.get(group.ownerId);
    if (account) account.exclusiveGroups.push(group);
    else accountGroups.set(group.ownerId, { id: group.ownerId, email: group.ownerEmail, username: group.ownerUsername, name: group.ownerName, publicGroups: [], exclusiveGroups: [group] });
  }
  const accountGroupList = orderByIds([...accountGroups.values()], accountOrder);
  const currentHref = mediaHref(listParams, page);
  const publicPageGroups = publicGroupList;
  const exclusivePageGroups = exclusiveGroupList;
  const accountPageGroups = accountGroupList;
  const quota = getMediaQuotaState(usage.bytes);
  const pendingPublic = Number(pendingPublicRows[0]?.total ?? 0);
  const pendingExclusive = Number(pendingExclusiveRows[0]?.total ?? 0);
  const publicTabParams = new URLSearchParams(listParams);
  publicTabParams.delete("tipo");
  const exclusiveTabParams = new URLSearchParams(listParams);
  exclusiveTabParams.set("tipo", "exclusive");
  exclusiveTabParams.delete("cuenta");
  exclusiveTabParams.delete("q");
  const accountTabParams = new URLSearchParams(listParams);
  accountTabParams.set("tipo", "accounts");
  accountTabParams.delete("perfil");
  const allPublicParams = new URLSearchParams(publicTabParams);
  allPublicParams.delete("perfil");

  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading
      eyebrow="MODERACIÓN DE MEDIOS"
      title={view === "exclusive" ? "Contenido exclusivo por cuenta" : view === "accounts" ? "Medios por cuenta" : selectedProfileId ? "Galería del anuncio" : "Galerías públicas por anuncio"}
      description={view === "exclusive" ? "Cada biblioteca pertenece a una cuenta y permanece disponible aunque el anuncio vinculado se pause o elimine." : view === "accounts" ? "Revisa en un solo lugar qué cuentas tienen archivos. Las cuentas con medios pendientes aparecen primero." : "Cada grupo corresponde a un anuncio. La foto de perfil y la galería pública se revisan aquí sin mezclarse con el contenido exclusivo de las cuentas."}
      backHref={backHref}
    />
    {params.notice && notices[params.notice] && <p className="admin-success" role="status">{notices[params.notice]}</p>}
    <nav className="admin-media-tabs" aria-label="Tipo de medios a moderar">
      <Link prefetch={false} className={view === "public" ? "is-active" : undefined} href={mediaHref(publicTabParams)}>Galerías públicas{pendingPublic > 0 && <b>{pendingPublic}</b>}</Link>
      <Link prefetch={false} className={view === "exclusive" ? "is-active" : undefined} href={mediaHref(exclusiveTabParams)}>Contenido exclusivo{pendingExclusive > 0 && <b>{pendingExclusive}</b>}</Link>
      <Link prefetch={false} className={view === "accounts" ? "is-active" : undefined} href={mediaHref(accountTabParams)}>Medios por cuenta</Link>
      {selectedProfileId && <Link prefetch={false} href={mediaHref(allPublicParams)}>Ver todos los anuncios</Link>}
    </nav>
    <form className="admin-media-filters" method="get">
      <input name="tipo" type="hidden" value={view} />
      {view === "accounts" && <label>Buscar cuenta<input name="q" type="search" defaultValue={params.q ?? ""} placeholder="Correo, usuario o nombre" /></label>}
      <label>Estado<select name="estado" defaultValue={status}><option value="">Todos</option><option value="pending">En revisión</option><option value="approved">Aprobados</option><option value="rejected">Rechazados</option></select></label>
      <label>Tipo de archivo<select name="archivo" defaultValue={fileType}><option value="">Fotos y videos</option><option value="image">Solo fotos</option><option value="video">Solo videos</option></select></label>
      <button className="button button-primary" type="submit">Aplicar filtros</button>
      {(accountQuery || status || fileType || selectedOwnerId) && <Link prefetch={false} className="button button-outline" href={`/admin/medios?tipo=${view}`}>Limpiar</Link>}
    </form>
    <section className={`admin-media-quota admin-media-quota-${quota.level}`}>
      <div><p>ALMACENAMIENTO R2</p><h2>{formatMediaBytes(usage.bytes)} registrados</h2><span>{usage.files} archivos · margen interno configurado: 8 GB</span></div>
      <strong>{pendingPublic + pendingExclusive} pendientes</strong>
      <small>{quota.message}</small>
    </section>
    {total === 0
      ? <section className="admin-empty"><h2>{selectedProfileId ? "No hay archivos que coincidan con este anuncio" : view === "exclusive" ? "No hay contenido exclusivo cargado" : view === "accounts" ? "No hay cuentas con medios para estos filtros" : "No hay galerías públicas cargadas"}</h2><p>{view === "exclusive" ? "Cuando una cuenta cargue contenido exclusivo, aparecerá en su biblioteca privada sin mezclarse con las galerías de anuncios." : view === "accounts" ? "Prueba cambiando el estado, el tipo de archivo o la búsqueda de cuenta." : "Cuando un anunciante suba una foto o un video público, aparecerá agrupado bajo su anuncio."}</p></section>
      : <section className="admin-media-profile-list" aria-label={view === "exclusive" ? "Bibliotecas exclusivas" : view === "accounts" ? "Cuentas con medios" : "Galerías públicas"}>
        {view === "public" ? publicPageGroups.map((group) => {
          const profilePhoto = group.items.filter((item) => item.media.isProfilePhoto);
          const gallery = group.items.filter((item) => !item.media.isProfilePhoto);
          const pending = group.items.filter((item) => item.media.moderationStatus === "pending").length;
          const profileHref = profilePublicPath({ handle: group.handle, slug: group.slug });
          const accountHref = `/admin/cuentas/${encodeURIComponent(group.ownerId)}?return_to=${encodeURIComponent(currentHref)}`;
          return <section className="admin-media-profile-group" key={group.id}>
            <header><div><p className="eyebrow">ANUNCIO</p><h2>{group.name}</h2><span><Link prefetch={false} className="admin-media-owner-link" href={accountHref}>{group.ownerUsername ? `@${group.ownerUsername}` : "Abrir cuenta propietaria"}</Link> · <a href={`mailto:${group.ownerEmail}`}>{group.ownerEmail}</a> · {listingStatusLabel(group.status)} · {group.items.length} archivo{group.items.length === 1 ? "" : "s"}{pending > 0 ? ` · ${pending} pendiente${pending === 1 ? "" : "s"}` : ""}</span></div><div><Link prefetch={false} className="button button-public-preview" href={profileHref} target="_blank">Ver anuncio público</Link><Link prefetch={false} className="button button-outline" href={`/admin/perfiles?q=${encodeURIComponent(group.name)}&return_to=${encodeURIComponent(currentHref)}`}>Abrir moderación</Link></div></header>
            {profilePhoto.length > 0 && <section><h3>Foto de perfil</h3><div className="admin-media-grid">{profilePhoto.map((item) => <PublicMediaCard key={item.media.id} media={item.media} profileName={group.name} returnTo={currentHref} />)}</div></section>}
            {gallery.length > 0 && <section><h3>Galería pública</h3><div className="admin-media-grid">{gallery.map((item) => <PublicMediaCard key={item.media.id} media={item.media} profileName={group.name} returnTo={currentHref} />)}</div></section>}
          </section>;
        }) : view === "exclusive" ? exclusivePageGroups.map((group) => {
          const pending = group.items.filter((item) => item.media.moderationStatus === "pending").length;
          const accountHref = `/admin/cuentas/${encodeURIComponent(group.ownerId)}?return_to=${encodeURIComponent(currentHref)}`;
          const profileHref = group.linkedProfileSlug ? profilePublicPath({ handle: group.linkedProfileHandle, slug: group.linkedProfileSlug }) : null;
          return <section className="admin-media-profile-group exclusive-account-media-group" key={group.id}>
            <header><div><p className="eyebrow">BIBLIOTECA PRIVADA DE CUENTA</p><h2>@{group.ownerUsername ?? group.ownerName ?? "usuario"}</h2><span>{group.linkedProfileName ? `Vinculada al anuncio ${group.linkedProfileName}` : "Sin anuncio vinculado"} · {group.items.length} archivo{group.items.length === 1 ? "" : "s"}{pending > 0 ? ` · ${pending} pendiente${pending === 1 ? "" : "s"}` : ""}</span></div><div><Link prefetch={false} className="button button-outline" href={accountHref}>Abrir cuenta</Link>{profileHref && <Link prefetch={false} className="button button-public-preview" href={profileHref} target="_blank">Ver anuncio vinculado</Link>}</div></header>
            <section><h3>Contenido exclusivo</h3><p className="admin-media-group-hint">Este contenido pertenece a la cuenta, no se publica libremente y mantiene los accesos autorizados aunque se pause o elimine el anuncio asociado.</p><div className="admin-media-grid">{group.items.map((item) => <ExclusiveMediaCard key={item.media.id} media={item.media} ownerUsername={group.ownerUsername} returnTo={currentHref} />)}</div></section>
          </section>;
        }) : accountPageGroups.map((group) => {
          const publicItems = group.publicGroups.flatMap((entry) => entry.items);
          const exclusiveItems = group.exclusiveGroups.flatMap((entry) => entry.items);
          const allItems = [...publicItems, ...exclusiveItems];
          const pending = allItems.filter((item) => item.media.moderationStatus === "pending").length;
          const images = allItems.filter((item) => item.media.mediaType === "image").length;
          const videos = allItems.length - images;
          const accountHref = `/admin/cuentas/${encodeURIComponent(group.id)}?return_to=${encodeURIComponent(currentHref)}`;
          const focusParams = new URLSearchParams(listParams);
          focusParams.set("tipo", "accounts");
          focusParams.set("cuenta", group.id);
          focusParams.delete("page");
          const focused = selectedOwnerId === group.id;
          return <section className="admin-media-profile-group admin-media-account-group" key={group.id}>
            <header><div><p className="eyebrow">CUENTA CON MEDIOS</p><h2>@{group.username ?? group.name ?? "usuario"}</h2><span><a href={`mailto:${group.email}`}>{group.email}</a> · {allItems.length} archivo{allItems.length === 1 ? "" : "s"} · {images} foto{images === 1 ? "" : "s"} · {videos} video{videos === 1 ? "" : "s"}{pending ? ` · ${pending} pendiente${pending === 1 ? "" : "s"}` : ""}</span></div><div><Link prefetch={false} className="button button-outline" href={accountHref}>Abrir cuenta</Link><Link prefetch={false} className="button button-public-preview" href={focused ? mediaHref(accountTabParams) : mediaHref(focusParams)}>{focused ? "Ver todas las cuentas" : "Ver medios de la cuenta"}</Link></div></header>
            {focused && <>
              {group.publicGroups.map((entry) => <section key={entry.id}><h3>Galería pública · {entry.name}</h3><div className="admin-media-grid">{entry.items.map((item) => <PublicMediaCard key={item.media.id} media={item.media} profileName={entry.name} returnTo={currentHref} />)}</div></section>)}
              {group.exclusiveGroups.map((entry) => <section key={entry.id}><h3>Contenido exclusivo</h3><div className="admin-media-grid">{entry.items.map((item) => <ExclusiveMediaCard key={item.media.id} media={item.media} ownerUsername={entry.ownerUsername} returnTo={currentHref} />)}</div></section>)}
            </>}
          </section>;
        })}
      </section>}
    <AdminPagination pathname="/admin/medios" params={listParams} currentPage={page} totalItems={total} pageSize={PAGE_SIZE} label={view === "exclusive" ? "Bibliotecas" : view === "accounts" ? "Cuentas" : "Anuncios"} />
  </div></AdminShell>;
}
