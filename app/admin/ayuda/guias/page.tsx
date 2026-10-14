import Link from "next/link";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import { helpGuides } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { ADMIN_CAPABILITY_LABELS, adminHasCapability } from "@/lib/admin-permissions";
import { AdminPageHeading, AdminShell } from "../../_components";
import { privatePageMetadata } from "@/lib/seo";
import { GuideForm } from "./GuideForm";
import "@/app/help/help-center.css";
export const dynamic="force-dynamic";
export const metadata=privatePageMetadata({title:"Administrar guías de ayuda",description:"Edición privada de guías y audiencias.",path:"/admin/ayuda/guias"});
export default async function HelpGuidesPage({searchParams}:{searchParams:Promise<{id?:string;notice?:string}>}) {
 const admin=await getCurrentAdmin();if(!admin)redirect('/api/auth/github/start?return_to=/admin/ayuda/guias');
 if(!adminHasCapability(admin,'settings.manage'))redirect('/admin');
 const params=await searchParams;
 const guides=await (await getDb()).select().from(helpGuides).orderBy(asc(helpGuides.audience),asc(helpGuides.category),asc(helpGuides.title)).limit(300);
 const guide=guides.find(item=>item.id===params.id);
 const arrayText=(value:string|undefined,separator:string)=>{try{const items=JSON.parse(value??'[]');return Array.isArray(items)?items.join(separator):'';}catch{return '';}};
 return <AdminShell user={admin}><div className="admin-content"><AdminPageHeading eyebrow="AYUDA · GUÍAS" title="Administrar guías" description="Crea, modifica, publica o retira guías. La audiencia determina qué información puede recibir cada panel. Eliminar retira una guía sin perder la opción de restaurarla." backHref="/admin/ayuda" />
  {params.notice&&<p className="account-success" role="status">La operación de la guía se completó.</p>}
  <div className="help-guide-admin"><aside className="help-guide-index"><Link className="button button-primary" href="/admin/ayuda/guias">Crear guía</Link>
   <details open><summary>Guías de usuarios</summary>{guides.filter(item=>item.audience!=='admin').map(item=><Link key={item.id} href={`/admin/ayuda/guias?id=${encodeURIComponent(item.id)}`} aria-current={item.id===guide?.id?'page':undefined}>{item.title}<small>{item.isDeleted?'Eliminada':item.isPublished?'Publicada':'Borrador'} · {item.audience==='all'?'Ambos paneles':item.testerOnly?'QA':'Usuarios'}</small></Link>)}</details>
   <details open><summary>Guías administrativas</summary>{guides.filter(item=>item.audience==='admin').map(item=><Link key={item.id} href={`/admin/ayuda/guias?id=${encodeURIComponent(item.id)}`} aria-current={item.id===guide?.id?'page':undefined}>{item.title}<small>{item.isDeleted?'Eliminada':item.isPublished?'Publicada':'Borrador'}</small></Link>)}</details>
  </aside><section className="help-guide-editor"><h2>{guide?'Editar guía':'Nueva guía'}</h2>
  <GuideForm key={guide?.id??'new'} label={guide?'Guardar guía':'Crear guía'}><input name="intent" type="hidden" value={guide?'update':'create'} /><input name="id" type="hidden" value={guide?.id??''} /><input name="version" type="hidden" value={guide?.updatedAt??''} />
   <label>Título<input name="title" required minLength={3} maxLength={160} defaultValue={guide?.title??''} /></label>
   <label>Audiencia<select name="audience" defaultValue={guide?.audience??'account'}><option value="account">Usuarios normales</option><option value="admin">Solo administración</option><option value="all">Ambos paneles (sin información administrativa)</option></select></label>
   <label>Categoría<input name="category" required maxLength={80} defaultValue={guide?.category??''} /></label>
   <label>Palabras clave (separadas por comas)<textarea name="aliases" maxLength={1500} rows={2} defaultValue={arrayText(guide?.aliases,', ')} /></label>
   <label>Resumen<textarea name="summary" required maxLength={1200} rows={3} defaultValue={guide?.summary??''} /></label>
   <label>Pasos (uno por línea, máximo 15)<textarea name="steps" required maxLength={6000} rows={8} defaultValue={arrayText(guide?.steps,'\n')} /></label>
   <label>Enlace de la sección<input name="link_href" required maxLength={300} placeholder="/mi-cuenta#mis-anuncios" defaultValue={guide?.linkHref??''} /></label>
   <label>Texto del enlace<input name="link_label" required maxLength={100} defaultValue={guide?.linkLabel??''} /></label>
   <label>Sección de un anuncio propio<select name="link_target" defaultValue={guide?.linkTarget??''}><option value="">Enlace fijo</option><option value="edit">Editar anuncio</option><option value="media">Fotos y videos</option><option value="documents">Documentos privados</option><option value="stories">Historias</option><option value="stats">Estadísticas</option><option value="preview">Vista previa</option></select></label>
   <label>Permiso necesario (solo guías administrativas)<select name="capability" defaultValue={guide?.capability??''}><option value="">Sin requisito adicional</option>{Object.entries(ADMIN_CAPABILITY_LABELS).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
   <label className="help-guide-check"><input name="tester_only" type="checkbox" value="yes" defaultChecked={guide?.testerOnly??false} />Solo cuentas de pruebas QA</label>
   <label className="help-guide-check"><input name="is_published" type="checkbox" value="yes" defaultChecked={guide?.isPublished??true} />Publicada en el chat y buscador de su audiencia</label>
  </GuideForm>
  {guide&&<GuideForm label={guide.isDeleted?'Restaurar guía':'Eliminar guía'}><input name="intent" type="hidden" value={guide.isDeleted?'restore':'delete'} /><input name="id" type="hidden" value={guide.id} /><input name="version" type="hidden" value={guide.updatedAt} /><p>{guide.isDeleted?'La restauración respeta la audiencia y el estado de publicación guardados.':'La guía dejará de aparecer. Podrás restaurarla desde esta misma página.'}</p></GuideForm>}
  </section></div>
 </div></AdminShell>;
}
