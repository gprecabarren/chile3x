import {redirect} from "next/navigation";
import {getCurrentAdmin} from "@/lib/auth";
import {adminHasCapability} from "@/lib/admin-permissions";
import {privatePageMetadata} from "@/lib/seo";
import {ADMIN_CONTENT_GROUPS,ADMIN_CONTENT_SECTIONS} from "@/lib/admin-content-navigation";
import {ActionAnchor} from "@/app/ActionButton";
import {ActionIcon} from "@/app/ActionIcon";
import {AdminShell,AdminPageHeading} from "../_components";
export const dynamic="force-dynamic";
export const metadata=privatePageMetadata({title:"Contenido del sitio",description:"Administración privada de noticias, sitios asociados, documentos y preguntas frecuentes.",path:"/admin/contenido"});
export default async function Page(){
 const admin=await getCurrentAdmin();if(!admin)redirect("/api/auth/github/start?return_to=/admin/contenido");
 const sections=ADMIN_CONTENT_SECTIONS.filter(section=>adminHasCapability(admin,section.capability));
 if(!sections.length)redirect("/admin/acceso-denegado?reason=permission");
 return <AdminShell user={admin}><div className="admin-content admin-content-hub">
  <AdminPageHeading eyebrow="ÍNDICE DE EDITORES" title="Contenido del sitio" description="Elige qué quieres cambiar. Los textos visibles y la configuración para buscadores están organizados por separado; entrar a un editor no publica cambios." backHref="/admin"/>
  {ADMIN_CONTENT_GROUPS.map(group=>{const entries=sections.filter(section=>section.group===group.id);return entries.length?<section className={`admin-content-group content-tone-${group.id}`} key={group.id} aria-labelledby={`content-group-${group.id}`}><header><ActionIcon name={group.icon}/><div><h2 id={`content-group-${group.id}`}>{group.label}</h2><p>{group.description}</p></div></header><div className="admin-content-editor-grid">{entries.map(section=><section key={section.href}><span className="admin-content-scope"><ActionIcon name={section.icon}/>{section.scope}</span><h3>{section.label}</h3><p>{section.description}</p><ActionAnchor className="button button-outline" href={section.href}>{section.action}</ActionAnchor></section>)}</div></section>:null;})}
 </div></AdminShell>;
}
