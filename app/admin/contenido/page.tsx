import {redirect} from "next/navigation";
import {getCurrentAdmin} from "@/lib/auth";
import {adminHasCapability} from "@/lib/admin-permissions";
import {privatePageMetadata} from "@/lib/seo";
import {ADMIN_CONTENT_SECTIONS} from "@/lib/admin-content-navigation";
import {ActionAnchor} from "@/app/ActionButton";
import {ActionIcon} from "@/app/ActionIcon";
import {AdminShell,AdminPageHeading} from "../_components";
export const dynamic="force-dynamic";
export const metadata=privatePageMetadata({title:"Contenido del sitio",description:"Administración privada de noticias, sitios asociados, documentos y preguntas frecuentes.",path:"/admin/contenido"});
export default async function Page(){
 const admin=await getCurrentAdmin();if(!admin)redirect("/api/auth/github/start?return_to=/admin/contenido");
 const sections=ADMIN_CONTENT_SECTIONS.filter(section=>adminHasCapability(admin,section.capability));
 if(!sections.length)redirect("/admin/acceso-denegado?reason=permission");
 return <AdminShell user={admin}><div className="admin-content"><AdminPageHeading eyebrow="EDICIÓN DEL PORTAL" title="Contenido del sitio" description="Todos los editores del contenido público reunidos en un mismo lugar. Cada sección conserva sus permisos, borradores y controles de publicación." backHref="/admin"/><div className="admin-content-editor-grid">{sections.map(section=><section key={section.href}><ActionIcon name={section.icon}/><h2>{section.label}</h2><p>{section.description}</p><ActionAnchor className="button button-outline" href={section.href}>Abrir editor</ActionAnchor></section>)}</div></div></AdminShell>;
}
