import Image from "next/image";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { profileMedia, profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { formatMediaBytes, getMediaQuotaState, getMediaUsage } from "@/lib/media";
import { AdminPageHeading, AdminShell } from "../_components";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  approved: "El archivo fue aprobado y ya puede verse si el perfil está publicado.",
  deleted: "El archivo se eliminó de R2 y del registro del perfil.",
  missing: "El archivo ya no existe.",
  error: "No se pudo actualizar el archivo.",
};

export default async function AdminMediaPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/medios");
  const db = await getDb();
  const [rows, usage, params] = await Promise.all([
    db.select({ media: profileMedia, profileName: profiles.displayName, profileSlug: profiles.slug, profileStatus: profiles.status, ownerEmail: users.email }).from(profileMedia).innerJoin(profiles, eq(profileMedia.profileId, profiles.id)).innerJoin(users, eq(profiles.ownerId, users.id)).orderBy(desc(profileMedia.createdAt)),
    getMediaUsage(), searchParams,
  ]);
  const quota = getMediaQuotaState(usage.bytes);
  const pending = rows.filter((row) => row.media.moderationStatus === "pending").length;
  const profilePhotos = rows.filter((row) => row.media.isProfilePhoto);
  const galleryFiles = rows.filter((row) => !row.media.isProfilePhoto);
  const cards = (items: typeof rows) => items.map((row) => <article key={row.media.id} className={`admin-media-card is-${row.media.moderationStatus}`}><div className="admin-media-preview">{row.media.mediaType === "image" ? <Image src={`/media/${row.media.id}`} alt={`Foto enviada por ${row.profileName}`} fill unoptimized sizes="(max-width: 720px) 100vw, 300px" /> : <video controls preload="metadata"><source src={`/media/${row.media.id}`} type={row.media.contentType} /></video>}</div><div><span className={`media-status media-status-${row.media.moderationStatus}`}>{row.media.moderationStatus === "approved" ? "Publicada" : row.media.moderationStatus === "pending" ? "En revisión" : "Rechazada"}</span><h2>{row.profileName}</h2><p>{row.media.isProfilePhoto ? "Foto de perfil" : row.media.mediaType === "video" ? "Video" : "Foto de galería"} · {row.ownerEmail} · {row.profileStatus} · {formatMediaBytes(row.media.byteSize)}</p><a href={`/perfil/${row.profileSlug}`} target="_blank" rel="noreferrer">Ver perfil público</a><form action={`/api/admin/media/${row.media.id}`} method="post"><button className="button button-primary" type="submit" name="action" value="approve" disabled={row.media.moderationStatus === "approved"}>Aprobar archivo</button><button className="button button-outline" type="submit" name="action" value="delete">Eliminar</button></form></div></article>);

  return <AdminShell user={admin}><div className="admin-content"><a className="page-back-link" href="/admin">← Volver al resumen</a>
    <AdminPageHeading eyebrow="MODERACIÓN DE MEDIOS" title="Galerías privadas" description="Cada foto o video llega privado a R2. Apruébalo solo después de revisar que corresponde al perfil y cumple las reglas de publicación." />
    {params.notice && notices[params.notice] && <p className="admin-success" role="status">{notices[params.notice]}</p>}
    <section className={`admin-media-quota admin-media-quota-${quota.level}`}><div><p>ALMACENAMIENTO R2</p><h2>{formatMediaBytes(usage.bytes)} registrados</h2><span>{usage.files} archivos · margen interno configurado: 8 GB</span></div><strong>{pending} pendientes</strong><small>{quota.message}</small></section>
    {rows.length === 0 ? <section className="admin-empty"><h2>No hay archivos cargados todavía</h2><p>Cuando un anunciante suba una foto o video, aparecerá aquí en estado “En revisión”.</p></section> : <><section className="admin-media-section"><div><p className="eyebrow">FOTOS PRINCIPALES</p><h2>Fotos de perfil</h2><span>Se revisan separadas de la galería y se usan como imagen prioritaria del aviso.</span></div>{profilePhotos.length ? <div className="admin-media-grid">{cards(profilePhotos)}</div> : <p className="admin-media-empty">No hay fotos de perfil pendientes o aprobadas.</p>}</section><section className="admin-media-section"><div><p className="eyebrow">GALERÍA Y VIDEOS</p><h2>Material complementario</h2></div>{galleryFiles.length ? <div className="admin-media-grid">{cards(galleryFiles)}</div> : <p className="admin-media-empty">No hay fotos ni videos de galería todavía.</p>}</section></>}
  </div></AdminShell>;
}
