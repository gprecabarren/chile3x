import { and, eq, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getOwnerStories } from "@/lib/stories";
import { AccountHeading, AccountShell } from "../../_components";
import { ProfileStoryManager } from "../../ProfileStoryManager";
import { accountStoryUnavailableReason, canPublishAccountStories } from "@/lib/account-stories-policy";
import { StorySupportLink } from "../../AccountStories";
import Link from "@/app/NavigationLink";

export const dynamic = "force-dynamic";

export default async function ProfileStoriesPage({ params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta");
  const { profileId } = await params;
  const [profile] = await (await getDb()).select({ id: profiles.id, displayName: profiles.displayName, status: profiles.status, ownerHiddenAt: profiles.ownerHiddenAt }).from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.ownerId, user.id), isNull(profiles.trashedAt))).limit(1);
  if (!profile) notFound();
  const canPublish = canPublishAccountStories(profile);
  const stories = await getOwnerStories(profileId);
  return <AccountShell user={user}><div className="account-content">
    <AccountHeading eyebrow="PUBLICACIÓN" title="Historias" description="Administra las actualizaciones efímeras de esta publicación sin mezclarlas con los datos del anuncio." backHref="/mi-cuenta/historias" />
    {!canPublish && <section className="account-stories-empty"><p>{accountStoryUnavailableReason(profile)} Puedes retirar tus historias activas, pero no publicar otras.</p><div className="account-story-actions"><Link className="button button-outline" href={`/mi-cuenta/${profileId}/editar`}>Editar anuncio</Link><StorySupportLink /></div></section>}
    <ProfileStoryManager profileId={profileId} profileName={profile.displayName} stories={stories} canPublish={canPublish} />
  </div></AccountShell>;
}
