import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { forumAttachments } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { mediaByteRange } from "@/lib/media-byte-range";
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{attachmentId:string}>}){
 const admin=await getCurrentAdmin();if(!adminHasCapability(admin,'forum.manage'))notFound();
 const {attachmentId}=await params,[file]=await (await getDb()).select().from(forumAttachments).where(eq(forumAttachments.id,attachmentId)).limit(1);if(!file)notFound();
 const range=mediaByteRange(request.headers.has('if-range')?null:request.headers.get('range'),file.byteSize);const headers=new Headers({'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff','accept-ranges':'bytes','content-type':file.contentType});
 if(range==='unsatisfiable'){headers.set('content-range',`bytes */${file.byteSize}`);return new Response(null,{status:416,headers});}
 const {env}=await import('cloudflare:workers'),object=await env.MEDIA?.get(file.r2Key,range?{range}:undefined);if(!object)notFound();
 headers.set('content-length',String(range?.length??object.size));headers.set('etag',object.httpEtag);if(range)headers.set('content-range',`bytes ${range.offset}-${range.offset+range.length-1}/${object.size}`);
 return new Response(object.body,{status:range?206:200,headers});
}
