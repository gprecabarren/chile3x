import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { profileDetails, profileServices, profileTags, profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "../../_components";
import { ProfileForm } from "../../ProfileForm";

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

export default async function EditProfilePage({ params, searchParams }: { params: Promise<{ profileId: string }>; searchParams: Promise<{ error?: string }> }) {
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
  const [tags, services] = await Promise.all([
    db.select({ tag: profileTags.tag }).from(profileTags).where(eq(profileTags.profileId, profileId)),
    db.select({ service: profileServices.service, kind: profileServices.kind }).from(profileServices).where(eq(profileServices.profileId, profileId)),
  ]);
  const query = await searchParams;

  return (
    <AccountShell user={user}>
      <div className="account-content">
        <AccountHeading eyebrow="EDITAR PUBLICACIÓN" title={row.profile.displayName} description="Si el aviso estaba publicado, cualquier actualización vuelve a revisión manual para proteger la calidad del directorio." />
        {query.error && <p className="form-alert" role="alert">No se pudieron guardar los cambios. Revisa los campos obligatorios.</p>}
        <ProfileForm
          action={`/api/perfiles/${profileId}`}
          submitLabel="Guardar y enviar a revisión"
          initial={{
            type: row.profile.type,
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
      </div>
    </AccountShell>
  );
}
