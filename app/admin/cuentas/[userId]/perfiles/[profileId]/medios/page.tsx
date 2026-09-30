import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminPageHeading, AdminShell } from "@/app/admin/_components";
import { ProfileMediaManager } from "@/app/mi-cuenta/ProfileMediaManager";
import { getDb } from "@/db";
import { profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { getMediaQuotaState, getMediaUsage, getProfileMedia } from "@/lib/media";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AdminProfileMediaPage({ params, searchParams }: {
  params: Promise<{ userId: string; profileId: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { userId, profileId } = await params;
  const admin = await getCurrentAdmin();
  if (!admin) redirect(`/api/auth/github/start?return_to=/admin/cuentas/${encodeURIComponent(userId)}`);
  if (!adminHasCapability(admin, "accounts.manage") || !adminHasCapability(admin, "media.moderate")) redirect("/admin/acceso-denegado?reason=permission");
  const db = await getDb();
  const [profile] = await db.select({
    id: profiles.id, displayName: profiles.displayName, status: profiles.status, ownerId: profiles.ownerId,
    ownerEmail: users.email, ownerActive: users.isActive,
  }).from(profiles).innerJoin(users, eq(profiles.ownerId, users.id))
    .where(and(eq(profiles.id, profileId), eq(profiles.ownerId, userId))).limit(1);
  if (!profile) notFound();
  const [media, usage, settings, query] = await Promise.all([getProfileMedia(profileId), getMediaUsage(), getSiteSettings(), searchParams]);
  const accountHref = `/admin/cuentas/${encodeURIComponent(userId)}`;
  const moderationHref = `/admin/perfiles?q=${encodeURIComponent(profile.ownerEmail)}&return_to=${encodeURIComponent(accountHref)}`;
  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="CREACIÓN ASISTIDA · MEDIOS" title={`Fotos y videos de ${profile.displayName}`} description={`Cuenta propietaria: ${profile.ownerEmail}. Las cargas de administración se aprueban al instante, pero el anuncio solo será público al aprobarlo en moderación.`} backHref={accountHref} />
    {query.notice === "profile_created" && <p className="admin-success" role="status">El anuncio se creó para esta cuenta. Ahora agrega la foto principal y los archivos de galería.</p>}
    {!profile.ownerActive && <p className="form-alert" role="alert">La cuenta está deshabilitada. Reactívala antes de subir archivos o publicar el anuncio.</p>}
    {profile.ownerActive && <ProfileMediaManager profileId={profileId} initialMedia={media.map((item) => ({ id: item.id, url: `/media/${item.id}`, mediaType: item.mediaType, contentType: item.contentType, moderationStatus: item.moderationStatus, visibility: item.visibility, isProfilePhoto: item.isProfilePhoto, byteSize: item.byteSize }))} initialQuota={{ bytes: usage.bytes, ...getMediaQuotaState(usage.bytes) }} mediaSettings={{ watermarkEnabled: settings.profile_gallery_watermark_enabled === "enabled", faceBlurEnabled: settings.profile_gallery_face_blur_enabled === "enabled" }} adminMode />}
    <div className="profile-form-actions"><Link prefetch={false} className="button button-primary" href={moderationHref}>Abrir moderación y publicar</Link><Link prefetch={false} className="button button-outline" href={accountHref}>Volver a la cuenta</Link></div>
    <p className="admin-create-profile-note">Estado actual del anuncio: {profile.status === "approved" ? "Publicado" : profile.status === "pending" ? "En revisión" : profile.status === "draft" ? "Borrador" : profile.status}. Las fotos y videos que suba después la persona propietaria seguirán el flujo normal de revisión.</p>
  </div></AdminShell>;
}
