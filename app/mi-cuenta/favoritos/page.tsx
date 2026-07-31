import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { favorites } from "@/db/schema";
import { ProfileGrid } from "@/app/directorio/_components";
import { getCurrentUser } from "@/lib/auth";
import { getPublicProfiles } from "@/lib/directory";
import { AccountHeading, AccountShell } from "../_components";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/favoritos");
  const rows = await (await getDb()).select({ profileId: favorites.profileId }).from(favorites)
    .where(eq(favorites.userId, user.id)).orderBy(desc(favorites.createdAt));
  const profiles = await getPublicProfiles();
  const saved = rows.flatMap((row) => profiles.filter((profile) => profile.id === row.profileId));

  return <AccountShell user={user}><div className="account-content"><Link className="page-back-link" href="/mi-cuenta">← Volver a mi cuenta</Link>
    <AccountHeading eyebrow="CUENTA" title="Tus favoritos" description="Perfiles que guardaste para encontrarlos más rápido. Solo tú puedes ver esta lista." />
    {saved.length > 0 ? <ProfileGrid profiles={saved} /> : <section className="account-empty"><h2>Aún no tienes favoritos</h2><p>Desde un perfil público presiona “Favorito” para guardarlo aquí.</p><Link className="button button-primary" href="/escorts">Explorar perfiles</Link></section>}
  </div></AccountShell>;
}
