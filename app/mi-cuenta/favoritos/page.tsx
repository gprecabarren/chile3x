import { and, desc, eq, notExists } from "drizzle-orm";
import Link from "@/app/NavigationLink";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { blockedProfiles, favorites, profiles } from "@/db/schema";
import { ProfileGrid } from "@/app/directorio/_components";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/directory";
import { AccountHeading, AccountShell } from "../_components";
import { AccountSocialTabs } from "../AccountSocialTabs";
import { publicProfileCondition } from "@/lib/public-profile-visibility";

export const dynamic = "force-dynamic";

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/favoritos");
  const db = await getDb();
  const params = await searchParams;
  const page = Math.max(1, Math.min(10_000, Number.parseInt(params.pagina ?? "1", 10) || 1));
  const rows = await db.select({ profileId: favorites.profileId }).from(favorites).innerJoin(profiles, eq(profiles.id, favorites.profileId))
    .where(and(eq(favorites.userId, user.id), publicProfileCondition, notExists(db.select({ id: blockedProfiles.id }).from(blockedProfiles).where(and(eq(blockedProfiles.userId, user.id), eq(blockedProfiles.profileId, profiles.id))))))
    .orderBy(desc(favorites.createdAt), desc(favorites.id)).limit(25).offset((page - 1) * 24);
  const hasMore = rows.length > 24;
  rows.splice(24);
  const publicProfiles = await getPublicProfiles({ profileIds: rows.map(row => row.profileId), viewerId: user.id });
  const byId = new Map(publicProfiles.map(profile => [profile.id, profile]));
  const saved = rows.flatMap(row => { const profile = byId.get(row.profileId); return profile ? [profile] : []; });

  return <AccountShell user={user}><div className="account-content"><Link className="page-back-link" href="/mi-cuenta">← Volver a mi cuenta</Link>
    <AccountHeading eyebrow="MI CUENTA" title="Favoritos y comentarios" description="Tus anuncios guardados y tus comentarios, reunidos en un solo lugar privado." />
    <AccountSocialTabs active="favorites" />
    <h2 className="account-section-title">Tus favoritos</h2>
    <p className="account-comments-help">Solo tú puedes ver esta lista. Los anuncios ocultos o que ya no están publicados no se muestran.</p>
    {saved.length > 0 ? <ProfileGrid profiles={saved} /> : <section className="account-empty"><h2>Aún no tienes favoritos</h2><p>Desde un anuncio público presiona “Favorito” para guardarlo aquí.</p><Link className="button button-primary" href="/escorts">Explorar anuncios</Link></section>}
    <nav className="admin-review-tabs" aria-label="Paginación de favoritos">{page > 1 && <Link href={`/mi-cuenta/favoritos?pagina=${page - 1}`} prefetch={false}>Anterior</Link>}{hasMore && <Link href={`/mi-cuenta/favoritos?pagina=${page + 1}`} prefetch={false}>Siguiente</Link>}</nav>
  </div></AccountShell>;
}
