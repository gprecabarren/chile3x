import {cookies} from "next/headers";
import {and,eq} from "drizzle-orm";
import {getDb} from "@/db";
import {privateSampleMedia} from "@/db/schema";
import {getCurrentAdmin} from "@/lib/auth";
import {canManageSamples,getPrivateSample,canOpenSample} from "@/lib/private-samples";
import {SAMPLE_COOKIE} from "@/lib/private-sample-policy";
import {mediaByteRange} from "@/lib/media-byte-range";
export async function GET(request:Request,{params}:{params:Promise<{sampleId:string;mediaId:string}>}) {
  const {sampleId,mediaId}=await params,admin=await getCurrentAdmin();
  const sample=canManageSamples(admin)?await getPrivateSample(sampleId):await canOpenSample(sampleId,(await cookies()).get(SAMPLE_COOKIE)?.value);
  if(!sample||sample.migratedAt)return new Response(null,{status:404});
  const file=(await (await getDb()).select().from(privateSampleMedia).where(and(eq(privateSampleMedia.sampleId,sampleId),eq(privateSampleMedia.id,mediaId))).limit(1))[0];
  if(!file)return new Response(null,{status:404});
  const range=mediaByteRange(request.headers.get("range"),file.byteSize);
  if(range==="unsatisfiable")return new Response(null,{status:416,headers:{"content-range":`bytes */${file.byteSize}`}});
  const {env}=await import("cloudflare:workers"),object=await env.MEDIA.get(file.r2Key,range?{range}:undefined);
  if(!object)return new Response(null,{status:404});
  return new Response(object.body,{status:range?206:200,headers:{"content-type":file.contentType,"cache-control":"private, no-store","x-robots-tag":"noindex, nofollow, noimageindex","x-content-type-options":"nosniff","accept-ranges":"bytes","content-length":String(range?.length??object.size),...(range?{"content-range":`bytes ${range.offset}-${range.offset+range.length-1}/${object.size}`}:{})}});
}
