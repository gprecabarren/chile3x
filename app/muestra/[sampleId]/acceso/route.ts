import {assertSameOrigin} from "@/lib/auth";
import {canOpenSample} from "@/lib/private-samples";
import {SAMPLE_COOKIE,sampleCookiePath} from "@/lib/private-sample-policy";
export async function POST(request:Request,{params}:{params:Promise<{sampleId:string}>}) {
  try{assertSameOrigin(request);}catch{return new Response(null,{status:403});}
  const length=Number(request.headers.get("content-length")??0);if(length>512)return new Response(null,{status:413});
  let token:unknown;try{const reader=request.body?.getReader();if(!reader)return new Response(null,{status:400});const parts:Uint8Array[]=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>512){await reader.cancel();return new Response(null,{status:413});}parts.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}token=JSON.parse(new TextDecoder().decode(bytes)).token;}catch{return new Response(null,{status:400});}
  const {sampleId}=await params,row=typeof token==="string"?await canOpenSample(sampleId,token):null;
  if(!row)return new Response(null,{status:401,headers:{"cache-control":"private, no-store"}});
  const secure=new URL(request.url).protocol==="https:"?"; Secure":"";
  return Response.json({opened:true},{headers:{"cache-control":"private, no-store","set-cookie":`${SAMPLE_COOKIE}=${token}; Path=${sampleCookiePath(sampleId)}; HttpOnly; SameSite=Lax; Max-Age=${Math.max(0,Math.floor((row.expiresAt-Date.now())/1000))}${secure}`}});
}
