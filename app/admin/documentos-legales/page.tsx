import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentAdmin } from '@/lib/auth';
import { adminHasCapability } from '@/lib/admin-permissions';
import { getAdminLegalDocument } from '@/lib/legal-documents';
import { legalKey } from '@/lib/legal-document';
import { privatePageMetadata } from '@/lib/seo';
import Link from '@/app/NavigationLink';
import { AdminShell,AdminPageHeading } from '../_components';
import { LegalEditor } from './LegalEditor';
export const dynamic='force-dynamic';
export const metadata:Metadata=privatePageMetadata({title:'Editor de textos legales',description:'Edición privada por bloques de Términos y Privacidad.',path:'/admin/documentos-legales'});
export default async function Page({searchParams}:{searchParams:Promise<{documento?:string}>}){
 const admin=await getCurrentAdmin();if(!admin)redirect('/api/auth/github/start?return_to=/admin/documentos-legales');if(!adminHasCapability(admin,'settings.manage'))redirect('/admin/acceso-denegado?reason=permission');
 const key=legalKey((await searchParams).documento)??'terms',state=await getAdminLegalDocument(key);
 return <AdminShell user={admin}><div className="admin-content legal-editor-page"><AdminPageHeading eyebrow="DOCUMENTACIÓN DEL PORTAL" title="Términos y privacidad" description="Edita los textos por secciones y bloques, conserva un borrador y publica una versión nueva cuando esté revisada. No necesitas modificar código." backHref="/admin/configuracion"/><nav className="legal-document-tabs" aria-label="Documento legal"><Link href="/admin/documentos-legales?documento=terms" aria-current={key==='terms'?'page':undefined}>Términos y condiciones</Link><Link href="/admin/documentos-legales?documento=privacy" aria-current={key==='privacy'?'page':undefined}>Política de privacidad</Link></nav><LegalEditor key={key} documentKey={key} initial={state.document} initialRevision={state.revision} initialVersion={state.version} initialPublishedAt={state.publishedAt} initialHasDraft={state.hasDraft} history={state.history}/></div></AdminShell>;
}
