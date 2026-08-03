import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { blockedProfiles, profiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "../_components";
import { UnblockButton } from "./UnblockButton";

export const dynamic = "force-dynamic";
export default async function BlockedProfilesPage() {
  const user = await getCurrentUser(); if (!user) redirect("/ingresar?return_to=/mi-cuenta/bloqueados");
  const rows = await (await getDb()).select({ profileId: profiles.id, name: profiles.displayName, city: profiles.city, type: profiles.type }).from(blockedProfiles).innerJoin(profiles, eq(blockedProfiles.profileId, profiles.id)).where(eq(blockedProfiles.userId, user.id)).orderBy(desc(blockedProfiles.createdAt));
  return <AccountShell user={user}><div className="account-content"><Link className="page-back-link" href="/mi-cuenta">← Volver a mi cuenta</Link><AccountHeading eyebrow="PRIVACIDAD" title="Anuncios ocultos" description="Estos anuncios no aparecen en tus listados, ciudades ni resultados de búsqueda. Puedes restaurarlos cuando quieras." />
    {rows.length ? <section className="blocked-profile-list">{rows.map((row) => <article key={row.profileId}><div><strong>{row.name}</strong><span>{row.type === "escort" ? "Escort" : row.type === "agency" ? "Agencia" : "Arriendo"} · {row.city}</span></div><UnblockButton profileId={row.profileId} /></article>)}</section> : <section className="account-empty"><h2>No has ocultado anuncios</h2><p>Si ocultas uno desde su perfil, aparecerá aquí.</p></section>}
  </div></AccountShell>;
}
