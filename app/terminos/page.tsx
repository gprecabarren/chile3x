import type { Metadata } from 'next';
import { LegalPage } from '@/app/legal/LegalPage';
import { LegalDocumentContent,LegalInline } from '@/app/legal/LegalDocumentContent';
import { getPublishedLegalDocument } from '@/lib/legal-documents';
import { publicPageMetadata } from '@/lib/seo';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{const {document}=await getPublishedLegalDocument('terms');return publicPageMetadata({title:document.title,description:document.description,path:'/terminos'});}
export default async function Page(){const {document,version,updatedAt}=await getPublishedLegalDocument('terms');return <LegalPage eyebrow="DOCUMENTACIÓN LEGAL" title={document.title} version={version} updatedAt={updatedAt} summary={document.summary?<p><LegalInline text={document.summary}/></p>:undefined} notice={document.notice?<LegalInline text={document.notice}/>:undefined}><LegalDocumentContent document={document}/></LegalPage>;}
