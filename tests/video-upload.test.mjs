import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import { BufferTarget, EncodedPacket, EncodedVideoPacketSource, Output, WebMOutputFormat } from "mediabunny";
import { assertVideoSource, isVideoSource, videoOutputSize, MAX_PREPARED_VIDEO_BYTES } from "../lib/video-policy.ts";
import { readUploadResponse } from "../lib/upload-response.ts";
import { limitMultipartUpload, multipartBodyLimit } from "../worker/upload-limits.ts";

const source = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const validationSource = (await source("lib/video-validation.ts"))
  .replace('"mediabunny"', JSON.stringify(import.meta.resolve("mediabunny")))
  .replace('"./video-policy"', JSON.stringify(new URL("../lib/video-policy.ts", import.meta.url).href));
const { validatePreparedVideo } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(validationSource)).toString("base64")}`);

test("video source recognizes iPhone MOV/empty MIME, with 50 MB and 10 second bounds", () => {
  assert.equal(isVideoSource({name:"IMG_1001.MOV",type:""}),true);
  assert.equal(isVideoSource({name:"video",type:"video/quicktime"}),true);
  assert.equal(isVideoSource({name:"foto.jpg",type:"image/jpeg"}),false);
  assert.doesNotThrow(()=>assertVideoSource(50_000_000,10.05));
  for(const size of [0,NaN,Infinity,50_000_001]) assert.throws(()=>assertVideoSource(size),/50 MB/);
  for(const duration of [0,NaN,Infinity,10.051]) assert.throws(()=>assertVideoSource(100,duration),/10 segundos/);
});

test("output stays bounded, even-sized, portrait-safe and never upscaled", () => {
  assert.deepEqual(videoOutputSize(640,360),{width:640,height:360});
  assert.deepEqual(videoOutputSize(1920,1080),{width:1280,height:720});
  assert.deepEqual(videoOutputSize(1080,1920),{width:720,height:1280});
  for(const [width,height] of [[3840,2160],[2160,3840],[1281,721],[601,1001]]) {
    const d=videoOutputSize(width,height); assert.ok(d.width<=width && d.height<=height && d.width*d.height<=921600); assert.equal(d.width%2,0);assert.equal(d.height%2,0);
  }
  assert.throws(()=>videoOutputSize(12000,12000),/4K/);
});

test("plain proxy 413 and malformed responses never leak JSON SyntaxError or HTML", async () => {
  await assert.rejects(readUploadResponse(new Response("Payload Too Large",{status:413})),/8 MB/);
  await assert.rejects(readUploadResponse(new Response("<html>gateway</html>",{status:502})),/Revisa tu conexión/);
  await assert.rejects(readUploadResponse(Response.json({error:"Los videos deben durar 10 segundos o menos."},{status:400})),/10 segundos/);
  assert.deepEqual(await readUploadResponse(Response.json({ok:true})),{ok:true});
  await assert.rejects(readUploadResponse(new Response("Payload Too Large",{status:413}),"Cada documento admite hasta 15 MB."),/15 MB/);
});

function multipart(path, size, known=true) {
  const headers={"content-type":"multipart/form-data; boundary=qa"}; if(known) headers["content-length"]=String(size);
  let remaining=size;
  const body=new ReadableStream({pull(controller){const n=Math.min(65536,remaining);if(!n)return controller.close();controller.enqueue(new Uint8Array(n));remaining-=n;}});
  return new Request(`https://chile3x.cl${path}`,{method:"POST",headers,body,duplex:"half"});
}
test("multipart bounds match galleries, exclusive media, documents and ordinary forms",async()=>{
  assert.equal(multipartBodyLimit("/api/perfiles/qa/media"),8_064_000);
  assert.equal(multipartBodyLimit("/api/admin/profiles/qa/media"),8_064_000);
  assert.equal(multipartBodyLimit("/api/mi-cuenta/contenido/medios"),8_064_000);
  assert.equal(multipartBodyLimit("/api/perfiles/qa/documentos/identity"),15_064_000);
  assert.equal(multipartBodyLimit("/api/perfiles/nuevo"),1_048_576);
  const compatible=multipart("/api/perfiles/qa/media",1_700_000);assert.equal(await limitMultipartUpload(compatible),compatible);
  for(const known of [true,false]) {
    const response=await limitMultipartUpload(multipart("/api/perfiles/qa/media",8_064_001,known)); assert.equal(response.status,413);assert.match((await response.json()).error,/tamaño/);assert.equal(response.headers.get("cache-control"),"private, no-store");
  }
  const streamed=await limitMultipartUpload(multipart("/api/perfiles/qa/media",1_700_000,false));assert.equal((await streamed.arrayBuffer()).byteLength,1_700_000);
  const document=multipart("/api/perfiles/qa/documentos/identity",14_000_000);assert.equal(await limitMultipartUpload(document),document);
  const largeForm=await limitMultipartUpload(multipart("/api/perfiles/nuevo",2_000_000));assert.equal(largeForm.status,413);
});

// Container fixtures exercise metadata validation only; they are not claimed
// to be decodable videos. Playback is tested separately with real QA clips.
async function webm(duration, codec="vp8") {
  const output=new Output({format:new WebMOutputFormat(),target:new BufferTarget()});
  const track=new EncodedVideoPacketSource(codec);output.addVideoTrack(track,{frameRate:1});
  await output.start();
  for(let second=0;second<duration;second++) await track.add(new EncodedPacket(new Uint8Array([0x10,0,0,0x9d,0x01,0x2a,0x40,0x01,0xf0,0]),"key",second,1),{decoderConfig:{codec:codec==="vp8"?"vp8":"av01.0.04M.08",codedWidth:320,codedHeight:240}});
  track.close();await output.finalize();return output.target.buffer;
}
test("server validates real container duration/codec before any R2 storage", async()=>{
  const result=await validatePreparedVideo(await webm(10),"video/webm");assert.equal(result.codec,"vp8");assert.equal(result.duration,10);
  await assert.rejects(validatePreparedVideo(await webm(11),"video/webm"),/10 segundos/);
  await assert.rejects(validatePreparedVideo(await webm(3,"av1"),"video/webm"),/preparación/);
  await assert.rejects(validatePreparedVideo(new TextEncoder().encode("not a movie").buffer,"video/mp4"),/validar/);
  await assert.rejects(validatePreparedVideo(new ArrayBuffer(MAX_PREPARED_VIDEO_BYTES+1),"video/mp4"),/8 MB/);
});

test("submission keeps media/documents before the long edit form and preserves moderation",async()=>{
  const edit=await source("app/mi-cuenta/[profileId]/editar/page.tsx");
  assert.ok(edit.indexOf("<ProfileMediaManager")<edit.indexOf("<ProfileForm"));
  assert.ok(edit.indexOf("<ProfileVerificationDocuments")<edit.indexOf("<ProfileForm"));
  const create=await source("app/admin/cuentas/[userId]/crear-perfil/page.tsx");assert.match(create,/submitLabel="Guardar y enviar a revisión"/);
  const api=await source("app/api/admin/cuentas/[userId]/perfiles/route.ts");assert.match(api,/submission.intent === "submit" \? "profile_submitted" : "profile_created"/);
  const adminMedia=await source("app/admin/cuentas/[userId]/perfiles/[profileId]/medios/page.tsx");assert.match(adminMedia,/Debe aprobarse desde moderación/);
});
