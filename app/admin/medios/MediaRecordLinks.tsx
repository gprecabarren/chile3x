import Link from "@/app/NavigationLink";
import { profilePublicPath } from "@/lib/profile";

export type MediaLinkedProfile = { id: string; slug: string; handle: string | null; status: string; trashedAt: string | null };

/** Pending listings have an administrative editor and a private preview too. */
export function MediaRecordLinks({ ownerId, profile, returnTo, canAccounts, canProfiles, canRecycle, showAccount = true }: {
  ownerId: string;
  profile?: MediaLinkedProfile | null;
  returnTo: string;
  canAccounts: boolean;
  canProfiles: boolean;
  canRecycle: boolean;
  showAccount?: boolean;
}) {
  const accountHref = `/admin/cuentas/${encodeURIComponent(ownerId)}?return_to=${encodeURIComponent(returnTo)}`;
  return <div className="admin-record-links">
    {showAccount && canAccounts && <Link prefetch={false} className="button button-outline" href={accountHref}>Ver cuenta</Link>}
    {profile && !profile.trashedAt && <>
      {canProfiles && <Link prefetch={false} className="button button-outline" href={`/admin/anuncios-publicaciones/${encodeURIComponent(profile.id)}/editar?return_to=${encodeURIComponent(returnTo)}`}>Revisar anuncio</Link>}
      <Link prefetch={false} className="button button-public-preview" href={`${profilePublicPath(profile)}?return_to=${encodeURIComponent(returnTo)}`} target="_blank" rel="noopener">{profile.status === "approved" ? "Ver / previsualizar anuncio" : "Previsualizar anuncio"}</Link>
    </>}
    {profile?.trashedAt && canRecycle && <Link prefetch={false} className="button button-outline" href={`/admin/anuncios-publicaciones/papelera?q=${encodeURIComponent(profile.id)}`}>Abrir anuncio en papelera</Link>}
    {!profile && canAccounts && <Link prefetch={false} className="button button-outline" href={`${accountHref}#anuncios`}>Ver anuncios de la cuenta</Link>}
  </div>;
}
