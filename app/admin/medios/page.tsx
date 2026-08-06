import Image from "next/image";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profileMedia, profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { formatMediaBytes, getMediaQuotaState, getMediaUsage } from "@/lib/media";
import { AdminPageHeading, AdminShell } from "../_components";
import { profilePublicPath } from "@/lib/profile";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  approved: "El archivo fue aprobado y ya puede verse si el perfil está publicado.",
  unapproved: "La aprobación fue cancelada. El archivo volvió a revisión privada.",
  deleted: "El archivo se eliminó de R2 y del registro del perfil.",
  missing: "El archivo ya no existe.",
  error: "No se pudo actualizar el archivo.",
};

type SearchParams = { notice?: string; perfil?: string };

export default async function AdminMediaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/medios");

  const db = await getDb();
  const [rows, usage, params] = await Promise.all([
    db.select({ media: profileMedia, profileId: profiles.id, profileName: profiles.displayName, profileSlug: profiles.slug, profileHandle: profiles.handle, profileStatus: profiles.status, ownerEmail: users.email }).from(profileMedia).innerJoin(profiles, eq(profileMedia.profileId, profiles.id)).innerJoin(users, eq(profiles.ownerId, users.id)).orderBy(desc(profileMedia.createdAt)),
    getMediaUsage(),
    searchParams,
  ]);
  const selectedProfileId = (params.perfil ?? "").trim();
  const visibleRows = selectedProfileId ? rows.filter((row) => row.profileId === selectedProfileId) : rows;
  const quota = getMediaQuotaState(usage.bytes);
  const pending = rows.filter((row) => row.media.moderationStatus === "pending").length;
  const returnTo = selectedProfileId ? `/admin/medios?perfil=${encodeURIComponent(selectedProfileId)}` : "/admin/medios";
  const groups = new Map<string, { id: string; name: string; slug: string; handle: string | null; status: string; ownerEmail: string; items: typeof visibleRows }>();
  for (const row of visibleRows) {
    const current = groups.get(row.profileId);
    if (current) current.items.push(row);
    else groups.set(row.profileId, { id: row.profileId, name: row.profileName, slug: row.profileSlug, handle: row.profileHandle, status: row.profileStatus, ownerEmail: row.ownerEmail, items: [row] });
  }

  const cards = (items: typeof visibleRows) => items.map((row) => <article key={row.media.id} className={`admin-media-card is-${row.media.moderationStatus}`}>
    <div className="admin-media-preview">{row.media.mediaType === "image" ? <Image src={`/media/${row.media.id}`} alt={`Archivo enviado por ${row.profileName}`} fill unoptimized sizes="(max-width: 720px) 100vw, 300px" /> : <video controls preload="metadata"><source src={`/media/${row.media.id}`} type={row.media.contentType} /></video>}</div>
    <div><span className={`media-status media-status-${row.media.moderationStatus}`}>{row.media.moderationStatus === "approved" ? "Publicada" : row.media.moderationStatus === "pending" ? "En revisión" : "Rechazada"}</span><p>{row.media.isProfilePhoto ? "Foto de perfil" : row.media.visibility === "exclusive" ? "Contenido exclusivo" : row.media.mediaType === "video" ? "Video de galería" : "Foto de galería"} · {formatMediaBytes(row.media.byteSize)}</p><form action={`/api/admin/media/${row.media.id}`} method="post"><input type="hidden" name="return_to" value={returnTo} />{row.media.moderationStatus === "approved" ? <button className="button button-outline" type="submit" name="action" value="unapprove">Cancelar aprobación</button> : <button className="button button-primary" type="submit" name="action" value="approve">Aprobar archivo</button>}<button className="button button-outline" type="submit" name="action" value="delete">Eliminar</button></form></div>
  </article>);

  return <AdminShell user={admin}><div className="admin-content"><a className="page-back-link" href="/admin">← Volver al resumen</a>
    <AdminPageHeading eyebrow="MODERACIÓN DE MEDIOS" title={selectedProfileId ? "Medios del anuncio" : "Medios por anuncio"} description="Revisa primero el aviso y luego sus archivos. Cada grupo corresponde a una sola publicación para que fotos, videos y contenido exclusivo nunca se mezclen." />
    {params.notice && notices[params.notice] && <p className="admin-success" role="status">{notices[params.notice]}</p>}
    {selectedProfileId && <a className="button button-outline admin-media-all-link" href="/admin/medios">Ver todos los anuncios</a>}
    <section className={`admin-media-quota admin-media-quota-${quota.level}`}><div><p>ALMACENAMIENTO R2</p><h2>{formatMediaBytes(usage.bytes)} registrados</h2><span>{usage.files} archivos · margen interno configurado: 8 GB</span></div><strong>{pending} pendientes</strong><small>{quota.message}</small></section>
    {visibleRows.length === 0 ? <section className="admin-empty"><h2>{selectedProfileId ? "Este anuncio aún no tiene medios" : "No hay archivos cargados todavía"}</h2><p>{selectedProfileId ? "Vuelve al perfil para completar foto de perfil, galería pública o contenido exclusivo." : "Cuando un anunciante suba una foto o video, aparecerá aquí agrupado bajo su anuncio."}</p></section> : <div className="admin-media-profile-list">{[...groups.values()].map((group) => {
      const profilePhoto = group.items.filter((item) => item.media.isProfilePhoto);
      const publicGallery = group.items.filter((item) => !item.media.isProfilePhoto && item.media.visibility === "public");
      const exclusiveGallery = group.items.filter((item) => !item.media.isProfilePhoto && item.media.visibility === "exclusive");
      return <section className="admin-media-profile-group" key={group.id}><header><div><p className="eyebrow">ANUNCIO</p><h2>{group.name}</h2><span>{group.ownerEmail} · {group.status} · {group.items.length} archivo{group.items.length === 1 ? "" : "s"}</span></div><div><a className="button button-outline" href={profilePublicPath({ handle: group.handle, slug: group.slug })} target="_blank" rel="noreferrer">Revisar perfil</a><a className="button button-outline" href={`/admin/perfiles?q=${encodeURIComponent(group.name)}`}>Abrir en perfiles</a></div></header>
        {profilePhoto.length > 0 && <section><h3>Foto de perfil</h3><div className="admin-media-grid">{cards(profilePhoto)}</div></section>}
        {publicGallery.length > 0 && <section><h3>Galería pública</h3><div className="admin-media-grid">{cards(publicGallery)}</div></section>}
        {exclusiveGallery.length > 0 && <section><h3>Galería privada</h3><p className="admin-media-group-hint">Solo puede verla el anunciante, el equipo administrador y las cuentas autorizadas.</p><div className="admin-media-grid">{cards(exclusiveGallery)}</div></section>}
      </section>;
    })}</div>}
  </div></AdminShell>;
}
