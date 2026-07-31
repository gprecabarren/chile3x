import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getOwnerStories } from "@/lib/stories";
import { AccountHeading, AccountShell } from "../../_components";
import { ProfileStoryManager } from "../../ProfileStoryManager";

export const dynamic = "force-dynamic";

export default async function ProfileStoriesPage({ params }: { params: Promise<{ profileId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta");
  const { profileId } = await params;
  const [profile] = await (await getDb()).select({ id: profiles.id, displayName: profiles.displayName, status: profiles.status }).from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.ownerId, user.id))).limit(1);
  if (!profile) notFound();
  if (profile.status !== "approved") redirect(`/mi-cuenta/${profileId}/editar`);
  const stories = await getOwnerStories(profileId);
  return <AccountShell user={user}><div className="account-content">
    <AccountHeading eyebrow="PUBLICACIÓN" title="Historias" description="Administra las actualizaciones efímeras de esta publicación sin mezclarlas con los datos del anuncio." backHref="/mi-cuenta" />
    <ProfileStoryManager profileId={profileId} profileName={profile.displayName} stories={stories} />
  </div></AccountShell>;
}
