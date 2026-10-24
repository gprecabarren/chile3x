import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAccountStoryOverview } from "@/lib/account-stories";
import { privatePageMetadata } from "@/lib/seo";
import { AccountHeading, AccountShell } from "../_components";
import { AccountStoryChoices } from "../AccountStories";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({ title: "Subir y administrar historias", description: "Selecciona uno de tus anuncios para publicar y administrar sus historias.", path: "/mi-cuenta/historias" });

export default async function AccountStoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/historias");
  const profiles = await getAccountStoryOverview();
  return <AccountShell user={user}><div className="account-content"><AccountHeading eyebrow="TUS ANUNCIOS · HISTORIAS" title="¿Dónde quieres publicar?" description="Elige el anuncio al que quieres subir historias. Solo los aprobados y visibles pueden publicar." backHref="/mi-cuenta" /><AccountStoryChoices profiles={profiles} /></div></AccountShell>;
}
