import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { profileDetails, profileExclusiveAccess, profileServices, profileTags, profiles, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getMediaQuotaState, getMediaUsage, getProfileMedia } from "@/lib/media";
import { AccountHeading, AccountShell } from "../../_components";
import { ProfileMediaManager } from "../../ProfileMediaManager";
import { ProfileForm } from "../../ProfileForm";
import { getVerificationDocuments } from "@/lib/verification-documents";
import { ExclusiveAccessManager } from "../../ExclusiveAccessManager";
import { ProfileVerificationDocuments } from "../../ProfileVerificationDocuments";

export const dynamic = "force-dynamic";

function readMetadata(value: string | null): Record<string, string> {
  try {
    const parsed = JSON.parse(value ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const entries = Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string");
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

export default async function EditProfilePage({ params, searchParams }: { params: Promise<{ profileId: string }>; searchParams: Promise<{ error?: string; notice?: string; message?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/ingresar?return_to=/mi-cuenta");
  }
  const { profileId } = await params;
  const db = await getDb();
  const [row] = await db.select({ profile: profiles, details: profileDetails }).from(profiles)
    .leftJoin(profileDetails, eq(profileDetails.profileId, profiles.id))
    .where(and(eq(profiles.id, profileId), eq(profiles.ownerId, user.id))).limit(1);
  if (!row) {
    notFound();
  }
  const [tags, services, media, usage, documents, grants] = await Promise.all([
    db.select({ tag: profileTags.tag }).from(profileTags).where(eq(profileTags.profileId, profileId)),
    db.select({ service: profileServices.service, kind: profileServices.kind }).from(profileServices).where(eq(profileServices.profileId, profileId)),
    getProfileMedia(profileId),
    getMediaUsage(),
    getVerificationDocuments(profileId),
    db.select({ userId: users.id, email: users.email, displayName: users.displayName }).from(profileExclusiveAccess).innerJoin(users, eq(profileExclusiveAccess.userId, users.id)).where(eq(profileExclusiveAccess.profileId, profileId)),
  ]);
  const query = await searchParams;

  return (
    <AccountShell user={user}>
      <div className="account-content"><a className="page-back-link" href="/mi-cuenta">← Volver a mi cuenta</a>
        <AccountHeading eyebrow="EDITAR PUBLICACIÓN" title={row.profile.displayName} description="Si el aviso estaba publicado, cualquier actualización vuelve a revisión manual para proteger la calidad del directorio." />
        {query.error && <p className="form-alert" role="alert">{query.message ?? "No se pudieron guardar los cambios. Revisa los campos obligatorios."}</p>}
        <ProfileForm
          action={`/api/perfiles/${profileId}`}
          submitLabel="Guardar y enviar a revisión"
          initial={{
            type: row.profile.type,
            handle: row.profile.handle,
            displayName: row.profile.displayName,
            region: row.profile.region,
            city: row.profile.city,
            comuna: row.profile.comuna ?? "",
            shortDescription: row.profile.shortDescription,
            description: row.profile.description,
            contactWhatsapp: row.profile.contactWhatsapp ?? "",
            contactTelegram: row.profile.contactTelegram ?? "",
            tier: row.profile.tier,
            details: {
              contactPhone: row.details?.contactPhone ?? "",
              contactEmail: row.details?.contactEmail ?? "",
              referenceLocation: row.details?.referenceLocation ?? "",
              schedule: row.details?.schedule ?? "",
              priceAmount: row.details?.priceAmount,
              currency: row.details?.currency ?? "CLP",
              metadata: readMetadata(row.details?.metadata ?? "{}"),
            },
            tags: tags.map((item) => item.tag),
            servicesIncluded: services.filter((item) => item.kind === "included").map((item) => item.service),
            servicesAdditional: services.filter((item) => item.kind === "additional").map((item) => item.service),
          }}
        />
        {row.profile.type === "escort" && <ProfileVerificationDocuments profileId={profileId} initialDocuments={documents} />}
        <ProfileMediaManager profileId={profileId} initialMedia={media.map((item) => ({ id: item.id, url: `/media/${item.id}`, mediaType: item.mediaType, contentType: item.contentType, moderationStatus: item.moderationStatus, visibility: item.visibility, isProfilePhoto: item.isProfilePhoto, byteSize: item.byteSize }))} initialQuota={{ bytes: usage.bytes, ...getMediaQuotaState(usage.bytes) }} />
        <ExclusiveAccessManager profileId={profileId} initialGrants={grants} />
      </div>
    </AccountShell>
  );
}
