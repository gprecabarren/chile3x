import {redirect} from "next/navigation";
import {getCurrentAdmin} from "@/lib/auth";
import {canManageSamples,listPrivateSamples} from "@/lib/private-samples";
import {privatePageMetadata} from "@/lib/seo";
import {ActionAnchor} from "@/app/ActionButton";
import {AdminShell,AdminPageHeading} from "../_components";
export const dynamic="force-dynamic";
export const metadata=privatePageMetadata({title:"Muestras privadas",description:"Presentaciones privadas de anuncios, sin crear cuentas ni publicaciones públicas.",path:"/admin/muestras"});
export default async function Page() {
  const admin=await getCurrentAdmin();if(!admin)redirect("/api/auth/github/start?return_to=/admin/muestras");if(!canManageSamples(admin))redirect("/admin/acceso-denegado?reason=permission");
  const rows=await listPrivateSamples();
  // eslint-disable-next-line react-hooks/purity -- Request-time expiry in a dynamic async server component, not client render state.
  return <AdminShell user={admin}><div className="admin-content"><AdminPageHeading eyebrow="PRESENTACIONES PARA ANUNCIANTES" title="Muestras privadas" description="Prepara un anuncio de ejemplo, comparte un enlace privado y conviértelo en una publicación real solo si la anunciante acepta." backHref="/admin"><ActionAnchor className="button button-primary" href="/admin/muestras/nueva">Crear muestra privada</ActionAnchor></AdminPageHeading><p className="admin-note">No son cuentas ni anuncios del directorio. El enlace vence a los 7 días y puede revocarse. Las muestras se eliminan automáticamente 30 días después de vencer si no se renuevan.</p><div className="samples-list">{rows.map(row=><article key={row.id}><div><h2>{row.displayName}</h2><p>{row.migratedAt?"Convertida en anuncio real":row.expiresAt<Date.now()?"Enlace vencido":row.shared?"Enlace privado habilitado":"Sin enlace compartido"}</p></div><ActionAnchor className="button button-outline" href={row.migratedProfileId?`/admin/anuncios-publicaciones/${row.migratedProfileId}/editar`:`/admin/muestras/${row.id}`}>{row.migratedAt?"Revisar anuncio real":"Administrar muestra"}</ActionAnchor></article>)}{!rows.length&&<p>No hay muestras privadas todavía.</p>}</div></div></AdminShell>;
}
