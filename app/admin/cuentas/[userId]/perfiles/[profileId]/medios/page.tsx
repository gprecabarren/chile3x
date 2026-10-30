import { and, eq } from "drizzle-orm";
import Link from "@/app/NavigationLink";
import { ReviewScope } from "@/app/admin/ReviewScope";
import { notFound, redirect } from "next/navigation";
import { AdminPageHeading, AdminShell } from "@/app/admin/_components";
import { bulkMediaMessages } from "@/lib/media-bulk-review";
import { profileModerationControls } from "@/app/admin/medios/profile-moderation-controls";
import { ProfileMediaManager } from "@/app/mi-cuenta/ProfileMediaManager";
import { ProfileVerificationDocuments } from "@/app/mi-cuenta/ProfileVerificationDocuments";
import { getVerificationDocuments } from "@/lib/verification-documents";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { getMediaQuotaState, getMediaUsage } from "@/lib/media";
import { getOwnerEditableProfileMedia } from "@/lib/owner-photo-edit";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AdminProfileMediaPage({ params, searchParams }: {
  params: Promise<{ userId: string; profileId: string }>;
  searchParams: Promise<{ notice?: string; media_notice?: string }>;
}) {
  const { userId, profileId } = await params;
  const admin = await getCurrentAdmin();
  if (!admin) redirect(`/api/auth/github/start?return_to=/admin/cuentas/${encodeURIComponent(userId)}`);
  if (!adminHasCapability(admin, "accounts.manage") || !adminHasCapability(admin, "media.moderate")) redirect("/admin/acceso-denegado?reason=permission");
  const db = await getDb();
  const [profile] = await db.select({
    revision: profiles.revision,
    id: profiles.id, type: profiles.type, displayName: profiles.displayName, status: profiles.status, ownerId: profiles.ownerId,
    ownerEmail: users.email, ownerActive: users.isActive,
  }).from(profiles).innerJoin(users, eq(profiles.ownerId, users.id))
    .where(and(eq(profiles.id, profileId), eq(profiles.ownerId, userId))).limit(1);
  if (!profile) notFound();
  const [media, usage, settings, query, documents] = await Promise.all([getOwnerEditableProfileMedia(profileId), getMediaUsage(), getSiteSettings(), searchParams, getVerificationDocuments(profileId)]);
  const accountHref = `/admin/cuentas/${encodeURIComponent(userId)}`;
  const moderationHref = `/admin/anuncios-publicaciones?q=${encodeURIComponent(profile.ownerEmail)}&return_to=${encodeURIComponent(accountHref)}`;
  return <AdminShell user={admin}><div className="admin-content"><ReviewScope resource={`profile:${profileId}`} revision={profile.revision}>
    <AdminPageHeading eyebrow="CREACIÓN ASISTIDA · MEDIOS" title={`Fotos y videos de ${profile.displayName}`} description={`Cuenta propietaria: ${profile.ownerEmail}. Las cargas de administración se aprueban al instante, pero el anuncio solo será público al aprobarlo en moderación.`} backHref={accountHref} />
    {query.media_notice && bulkMediaMessages[query.media_notice] && <p className="admin-notice" role="status">{bulkMediaMessages[query.media_notice]}</p>}
    {query.notice === "profile_created" && <p className="admin-success" role="status">El anuncio se creó para esta cuenta. Ahora agrega la foto principal y los archivos de galería.</p>}
    {query.notice === "profile_submitted" && <p className="admin-success" role="status">Anuncio guardado y enviado a revisión. Debe aprobarse desde moderación antes de aparecer en el directorio. Mientras tanto puedes adjuntar sus fotos, videos y documentos privados opcionales.</p>}
    {!profile.ownerActive && <p className="form-alert" role="alert">La cuenta está deshabilitada. Reactívala antes de subir archivos o publicar el anuncio.</p>}
    {profile.ownerActive && <ProfileMediaManager {...profileModerationControls(profileId, profile.revision, media, `/admin/cuentas/${userId}/perfiles/${profileId}/medios`)} profileId={profileId} initialMedia={media.map((item) => ({ id: item.id, url: `/media/${item.id}`, mediaType: item.mediaType, contentType: item.contentType, moderationStatus: item.moderationStatus, visibility: item.visibility, isProfilePhoto: item.isProfilePhoto, byteSize: item.byteSize, replacementOf: item.replacementOf }))} initialQuota={{ bytes: usage.bytes, ...getMediaQuotaState(usage.bytes) }} mediaSettings={{ watermarkEnabled: settings.profile_gallery_watermark_enabled === "enabled", faceBlurEnabled: settings.profile_gallery_face_blur_enabled === "enabled" }} adminMode />}
    {profile.ownerActive && profile.type === "escort" && <ProfileVerificationDocuments profileId={profileId} initialDocuments={documents} />}
    <div className="profile-form-actions"><Link prefetch={false} className="button button-primary" href={moderationHref}>Abrir moderación y publicar</Link><Link prefetch={false} className="button button-outline" href={accountHref}>Volver a la cuenta</Link></div>
    <p className="admin-create-profile-note">Estado actual del anuncio: {profile.status === "approved" ? "Publicado" : profile.status === "pending" ? "En revisión" : profile.status === "draft" ? "Borrador" : profile.status}. Las fotos y videos que suba después la persona propietaria seguirán el flujo normal de revisión.</p>
  </ReviewScope></div></AdminShell>;
}
