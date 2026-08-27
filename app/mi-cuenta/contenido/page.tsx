import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getBuyerExclusiveContent, getSellerExclusiveContent } from "@/lib/exclusive-content";
import { getMediaQuotaState, getMediaUsage } from "@/lib/media";
import { AccountHeading, AccountShell } from "../_components";
import { ExclusiveContentManager } from "../ExclusiveContentManager";

export const dynamic = "force-dynamic";

export default async function AccountContentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?return_to=/mi-cuenta/contenido");
  const [seller, buyerCollections, usage] = await Promise.all([
    getSellerExclusiveContent(user.id),
    getBuyerExclusiveContent(user.id),
    getMediaUsage(),
  ]);

  return <AccountShell user={user}><div className="account-content account-content-library">
    <AccountHeading eyebrow="MI CONTENIDO" title="Biblioteca privada" description="Aquí administras el contenido exclusivo de tu cuenta y ves el contenido al que otras personas te hayan autorizado." backHref="/mi-cuenta" />
    <ExclusiveContentManager
      initialMedia={seller.media.map((media) => ({ id: media.id, url: `/contenido/${media.id}`, mediaType: media.mediaType, contentType: media.contentType, moderationStatus: media.moderationStatus, byteSize: media.byteSize }))}
      initialGrants={seller.grants}
      escortProfiles={seller.escortProfiles}
      linkedProfileId={seller.collection.profileId}
      initialQuota={{ bytes: usage.bytes, ...getMediaQuotaState(usage.bytes) }}
    />
    <section className="buyer-content-library"><div><p className="eyebrow">CONTENIDO RECIBIDO</p><h2>Mi contenido desbloqueado</h2><p>Cuando una cuenta te autoriza, sus archivos aparecen aquí. Aunque su anuncio se pause o deje de estar publicado, tu acceso continúa mientras la persona no lo retire.</p></div>
      {buyerCollections.length ? <div className="buyer-content-grid">{buyerCollections.map((collection) => <article key={collection.id}><header><span>De la cuenta</span><strong>@{collection.sellerUsername}</strong>{collection.profileName && <small>Anuncio vinculado: {collection.profileName}</small>}</header>{collection.media.length ? <div className="exclusive-media-grid">{collection.media.map((media, index) => <figure key={media.id}>{media.mediaType === "image" ? <Image src={`/contenido/${media.id}`} alt={`Contenido exclusivo ${index + 1} de @${collection.sellerUsername}`} fill unoptimized sizes="(max-width: 620px) 85vw, 33vw" /> : <video controls playsInline preload="metadata"><source src={`/contenido/${media.id}`} type={media.contentType} /></video>}</figure>)}</div> : <p className="profile-media-empty">Esta biblioteca todavía no tiene archivos aprobados.</p>}</article>)}</div> : <p className="profile-media-empty">Todavía no tienes contenido desbloqueado. Cuando una persona te autorice, aparecerá aquí con su nombre de usuario.</p>}
    </section>
  </div></AccountShell>;
}
