import { and, desc, eq, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { AccountHeading, AccountShell } from "../_components";
import { HelpCenter } from "@/app/help/HelpCenter";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getStoredHelpTopics } from "@/lib/help-guides";
import { publicWhatsappContacts } from "@/lib/portal-whatsapp";
import { getSiteSettings } from "@/lib/site-settings";
import { profilePublicPath } from "@/lib/profile";
import { privatePageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Centro de ayuda beta", description: "Guías privadas del panel de cuenta de Chile3X.", path: "/mi-cuenta/ayuda" });

export default async function AccountHelpPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/ayuda");
  const settings = await getSiteSettings();
  if (settings.account_help_enabled !== "enabled") notFound();
  const db = await getDb();
  const owned = await db.select({ id: profiles.id, name: profiles.displayName, handle: profiles.handle, slug: profiles.slug }).from(profiles).where(and(eq(profiles.ownerId, user.id), isNull(profiles.trashedAt))).orderBy(desc(profiles.createdAt)).limit(100);
  const topics = await getStoredHelpTopics("account", { tester: user.role === "tester" });
  return <AccountShell user={user}><div className="account-content"><AccountHeading eyebrow="MI CUENTA · AYUDA" title="Centro de ayuda" description="Pregunta por una tarea o explora las guías de tu cuenta. Johnny Sins te muestra pasos y enlaces, sin hacer cambios por ti." backHref="/mi-cuenta" />
    <HelpCenter audience="account" topics={topics} contacts={publicWhatsappContacts(settings)} profiles={owned.map(profile => ({ id: profile.id, name: profile.name, publicPath: profilePublicPath(profile) }))} />
  </div></AccountShell>;
}
