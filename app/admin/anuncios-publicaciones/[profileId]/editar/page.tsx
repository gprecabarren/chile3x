import { and, eq, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "@/app/NavigationLink";
import { AdminPageHeading, AdminShell } from "@/app/admin/_components";
import { ProfileForm } from "@/app/mi-cuenta/ProfileForm";
import { ProfileMediaManager } from "@/app/mi-cuenta/ProfileMediaManager";
import { ProfileVerificationDocuments } from "@/app/mi-cuenta/ProfileVerificationDocuments";
import { ProfileStoryManager } from "@/app/mi-cuenta/ProfileStoryManager";
import { getDb } from "@/db";
import { profileDetails, profileServices, profileTags, profiles, users } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { getMediaQuotaState, getMediaUsage, getProfileMedia } from "@/lib/media";
import { getVerificationDocuments } from "@/lib/verification-documents";
import { getOwnerStories } from "@/lib/stories";
import { getSiteSettings } from "@/lib/site-settings";
import { profilePublicPath } from "@/lib/profile";

export const dynamic = "force-dynamic";

function readMetadata(value: string | null): Record<string, string> {
  try {
    const parsed = JSON.parse(value ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch { return {}; }
}

export default async function AdminEditProfilePage({ params, searchParams }: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ notice?: string; error?: string; message?: string }>;
}) {
  const { profileId } = await params;
  const admin = await getCurrentAdmin();
  const editHref = `/admin/anuncios-publicaciones/${encodeURIComponent(profileId)}/editar`;
  if (!admin) redirect(`/api/auth/github/start?return_to=${encodeURIComponent(editHref)}`);
  if (!adminHasCapability(admin, "profiles.moderate")) redirect("/admin/acceso-denegado?reason=permission");
  const db = await getDb();
  const [row] = await db.select({ profile: profiles, details: profileDetails, ownerEmail: users.email, ownerActive: users.isActive })
    .from(profiles).innerJoin(users, eq(profiles.ownerId, users.id)).leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id))
    .where(and(eq(profiles.id, profileId), isNull(profiles.trashedAt))).limit(1);
  if (!row) notFound();
  const canUpload = adminHasCapability(admin, "accounts.manage") && adminHasCapability(admin, "media.moderate");
  const canReadDocuments = adminHasCapability(admin, "private.view");
  const [tags, services, media, usage, documents, settings, stories, query] = await Promise.all([
    db.select({ tag: profileTags.tag }).from(profileTags).where(eq(profileTags.profileId, profileId)),
    db.select({ service: profileServices.service, kind: profileServices.kind }).from(profileServices).where(eq(profileServices.profileId, profileId)),
    canUpload ? getProfileMedia(profileId) : Promise.resolve([]),
    canUpload ? getMediaUsage() : Promise.resolve({ bytes: 0 }),
    canReadDocuments && row.profile.type === "escort" ? getVerificationDocuments(profileId) : Promise.resolve([]),
    getSiteSettings(), getOwnerStories(profileId), searchParams,
  ]);
  const profile = row.profile;
  return <AdminShell user={admin}><div className="admin-content admin-profile-editor">
    <AdminPageHeading eyebrow="EDICIÓN ADMINISTRATIVA" title={profile.displayName} description={`Anuncio de ${row.ownerEmail}. Guardar conserva su estado y registra el cambio en el historial administrativo.`} backHref="/admin/anuncios-publicaciones">
      <Link className="button button-public-preview" href={profilePublicPath(profile)} target="_blank">Ver / previsualizar anuncio</Link>
    </AdminPageHeading>
    <nav className="profile-editor-shortcuts" aria-label="Secciones del anuncio">
      <a className="button button-outline" href="#datos-del-anuncio">Editar datos</a>
      {canUpload && <a className="button button-outline" href="#fotos-y-videos">Fotos y videos</a>}
      {canReadDocuments && profile.type === "escort" && <a className="button button-outline" href="#documentos-privados">Documentos privados</a>}
      <a className="button button-outline" href="#historias">Historias y estados</a>
      <Link className="button button-outline" href={`/admin/anuncios-publicaciones?q=${encodeURIComponent(profile.displayName)}`}>Cambiar estados del anuncio</Link>
    </nav>
    {query.notice === "saved" && <p className="admin-success" role="status">Datos guardados. El anuncio conserva su estado de publicación y verificación.</p>}
    {query.notice === "story_deleted" && <p className="admin-success" role="status">Historia eliminada y movimiento registrado.</p>}
    {query.error && <p className="form-alert" role="alert">{query.message ?? "No se pudo guardar. Revisa los campos."}</p>}
    {!row.ownerActive && <p className="form-alert" role="alert">La cuenta propietaria está deshabilitada. Reactívala desde Cuentas antes de editar o publicar historias.</p>}
    {row.ownerActive && canUpload && <ProfileMediaManager adminMode profileId={profileId} initialMedia={media.map(item => ({ id: item.id, url: `/media/${item.id}`, mediaType: item.mediaType, contentType: item.contentType, moderationStatus: item.moderationStatus, visibility: item.visibility, isProfilePhoto: item.isProfilePhoto, byteSize: item.byteSize }))} initialQuota={{ bytes: usage.bytes, ...getMediaQuotaState(usage.bytes) }} mediaSettings={{ watermarkEnabled: settings.profile_gallery_watermark_enabled === "enabled", faceBlurEnabled: settings.profile_gallery_face_blur_enabled === "enabled" }} />}
    {canReadDocuments && profile.type === "escort" && <ProfileVerificationDocuments profileId={profileId} initialDocuments={documents} />}
    {row.ownerActive && profile.status === "approved" && !profile.ownerHiddenAt
      ? <ProfileStoryManager adminMode canUploadImages={adminHasCapability(admin, "media.moderate")} profileId={profileId} profileName={profile.displayName} stories={stories} />
      : <section id="historias" className="admin-empty"><h2>Historias y estados de texto</h2><p>Para publicar historias, el anuncio debe estar publicado, visible y pertenecer a una cuenta activa. No se cambia su estado automáticamente.</p></section>}
    {row.ownerActive && <section id="datos-del-anuncio" className="profile-editor-fields"><ProfileForm adminEdit action={`/api/admin/profiles/${profileId}/editar`} submitLabel="Guardar cambios del anuncio" initial={{
      type: profile.type, handle: profile.handle, displayName: profile.displayName, region: profile.region, city: profile.city, comuna: profile.comuna ?? "",
      shortDescription: profile.shortDescription, description: profile.description, contactWhatsapp: profile.contactWhatsapp ?? "", contactTelegram: profile.contactTelegram ?? "", tier: profile.tier,
      details: { contactPhone: row.details?.contactPhone ?? "", contactEmail: row.details?.contactEmail ?? "", referenceLocation: row.details?.referenceLocation ?? "", schedule: row.details?.schedule ?? "", priceAmount: row.details?.priceAmount, currency: row.details?.currency ?? "CLP", metadata: readMetadata(row.details?.metadata ?? "{}") },
      tags: tags.map(item => item.tag), servicesIncluded: services.filter(item => item.kind === "included").map(item => item.service), servicesAdditional: services.filter(item => item.kind === "additional").map(item => item.service),
    }} /></section>}
  </div></AdminShell>;
}
