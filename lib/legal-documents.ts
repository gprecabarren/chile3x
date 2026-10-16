import { cache } from 'react';
import { eq,desc,sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { legalDocuments,legalDocumentVersions } from '@/db/schema';
import { DEFAULT_LEGAL_DOCUMENTS } from '@/lib/legal-defaults';
import { validateLegalDocument,INITIAL_LEGAL_DATE,INITIAL_LEGAL_VERSION,type LegalKey,type LegalDocument } from '@/lib/legal-document';
import { guardedBatch,type ReviewVersion } from '@/lib/collaboration';
import { chileanDay,storedChileanDay } from '@/lib/chile-day';

function documentJson(value:string|null,key:LegalKey){return value?validateLegalDocument(JSON.parse(value),true):DEFAULT_LEGAL_DOCUMENTS[key];}
export const getPublishedLegalDocument=cache(async(key:LegalKey)=>{
 try{const [row]=await (await getDb()).select({json:legalDocuments.publishedJson,version:legalDocuments.version,publishedAt:legalDocuments.publishedAt}).from(legalDocuments).where(eq(legalDocuments.id,key)).limit(1);
  return {document:documentJson(row?.json??null,key),version:row?.version??INITIAL_LEGAL_VERSION,updatedAt:storedChileanDay(row?.publishedAt??INITIAL_LEGAL_DATE)};
 }catch(error){if(error instanceof Error&&error.message.includes('cloudflare:'))return {document:DEFAULT_LEGAL_DOCUMENTS[key],version:INITIAL_LEGAL_VERSION,updatedAt:INITIAL_LEGAL_DATE};throw error;}
});
export const getLegalVersionSummary=cache(async()=>{
 const result={terms:{version:INITIAL_LEGAL_VERSION,updatedAt:INITIAL_LEGAL_DATE},privacy:{version:INITIAL_LEGAL_VERSION,updatedAt:INITIAL_LEGAL_DATE}};
 try{for(const row of await (await getDb()).select({id:legalDocuments.id,version:legalDocuments.version,updatedAt:legalDocuments.publishedAt}).from(legalDocuments)){result[row.id]={version:row.version,updatedAt:storedChileanDay(row.updatedAt)};}}
 catch(error){if(!(error instanceof Error&&error.message.includes('cloudflare:')))throw error;}
 return result;
});
export async function getAdminLegalDocument(key:LegalKey){
 const db=await getDb(),[row]=await db.select().from(legalDocuments).where(eq(legalDocuments.id,key)).limit(1);
 if(!row)throw new Error('No está inicializado el editor legal.');
 const history=await db.select({version:legalDocumentVersions.version,publishedAt:legalDocumentVersions.publishedAt}).from(legalDocumentVersions).where(eq(legalDocumentVersions.documentId,key)).orderBy(desc(legalDocumentVersions.publishedAt)).limit(10);
 return {document:row.draftJson?validateLegalDocument(JSON.parse(row.draftJson)):documentJson(row.publishedJson,key),published:documentJson(row.publishedJson,key),version:row.version,publishedAt:row.publishedAt,revision:row.revision,hasDraft:!!row.draftJson,history};
}
export async function saveLegalDocument(key:LegalKey,document:LegalDocument,intent:'draft'|'publish'|'discard',version:ReviewVersion,adminId:string){
 const db=await getDb(),now=new Date().toISOString(),[current]=await db.select().from(legalDocuments).where(eq(legalDocuments.id,key)).limit(1);
 if(!current)throw new Error('Documento no encontrado.');
 const serialized=JSON.stringify(validateLegalDocument(document,intent==='publish'));
 let publishedVersion=current.version;
 if(intent==='publish'){
  const prefix=chileanDay().replaceAll('-','.')+'.';
  const sequence=await db.get<{n:number}>(sql`select coalesce(max(cast(substr(version,${prefix.length+1}) as integer)),0) n from legal_document_versions where document_id=${key} and version like ${prefix+'%'}`);
  publishedVersion=prefix+(Number(sequence?.n??0)+1);
  await guardedBatch(version,[
   db.insert(legalDocumentVersions).values({id:crypto.randomUUID(),documentId:key,version:current.version,documentJson:current.publishedJson??JSON.stringify(DEFAULT_LEGAL_DOCUMENTS[key]),publishedAt:current.publishedAt,publishedBy:current.publishedJson?current.updatedBy:null}).onConflictDoNothing(),
   db.insert(legalDocumentVersions).values({id:crypto.randomUUID(),documentId:key,version:publishedVersion,documentJson:serialized,publishedAt:now,publishedBy:adminId}),
   db.update(legalDocuments).set({publishedJson:serialized,draftJson:null,version:publishedVersion,publishedAt:now,updatedAt:now,updatedBy:adminId}).where(eq(legalDocuments.id,key)),
  ],adminId);
 }else await guardedBatch(version,[db.update(legalDocuments).set({draftJson:intent==='discard'?null:serialized,updatedAt:now,updatedBy:adminId}).where(eq(legalDocuments.id,key))],adminId);
 return {version:publishedVersion,revision:version.revision+1,publishedAt:intent==='publish'?now:current.publishedAt,document:intent==='discard'?documentJson(current.publishedJson,key):document,hasDraft:intent==='draft'};
}
