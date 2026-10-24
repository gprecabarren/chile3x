"use client";
import { ActionButton } from "@/app/ActionButton";
import { useEffect,useRef,useState } from "react";
import { useRouter } from "next/navigation";
import { prepareGalleryImage } from "@/app/mi-cuenta/watermark-image";
import { isImageSource,assertImageSource } from "@/lib/image-upload-policy";
import { isVideoSource } from "@/lib/video-policy";
export function ForumAttachmentUpload({postId,version}:{postId:string;version:string}){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[consent,setConsent]=useState(false),[watermark,setWatermark]=useState(false);const abort=useRef<AbortController|null>(null),fileInput=useRef<HTMLInputElement>(null),router=useRouter();
 useEffect(()=>()=>abort.current?.abort(),[]);
 async function upload(input:HTMLInputElement){if(!input.files?.length||busy||!consent)return;setBusy(true);const failures:string[]=[];let saved=0;
  try{for(const original of [...input.files])try{
   let prepared:File;if(isImageSource(original)){assertImageSource(original.size);setNotice(`Preparando ${original.name}…`);prepared=(await prepareGalleryImage(original,{maxBytes:5_000_000,maxDimension:2200,applyWatermark:watermark,blurFaces:false,onProgress:setNotice})).file;}
   else if(isVideoSource(original)){const controller=new AbortController();abort.current=controller;const {prepareVideo}=await import('@/app/mi-cuenta/prepare-video');prepared=(await prepareVideo(original,{signal:controller.signal,watermark,onProgress:setNotice})).file;}
   else throw new Error('Formato no admitido. No se permiten PDF, SVG ni documentos privados.');
   const form=new FormData();form.set('file',prepared);form.set('consent','yes');form.set('rules_ack','yes');form.set('rules_version',version);
   const response=await fetch(`/api/admin/foro/adjuntos/${postId}`,{method:'POST',body:form,headers:{accept:'application/json'}});const data=await response.json();if(!response.ok)throw new Error(data.message??data.error??'No se confirmó la carga. Revise los adjuntos antes de repetir.');saved++;
  }catch(cause){failures.push(`${original.name}: ${cause instanceof Error?cause.message:'No se pudo preparar o guardar el archivo.'}`);}finally{abort.current=null;}
  setNotice(`${saved} archivo(s) guardado(s) en revisión.${failures.length?`\nArchivos no guardados:\n${failures.join('\n')}`:''}`);if(saved)router.refresh();
  }finally{input.value='';setBusy(false);}
 }
 return <div className="forum-attachment-upload"><p>Hasta cuatro adjuntos por mensaje: fotos finales de 5 MB; videos finales de 12 MB y 15 segundos. Se prepara y guarda solo la versión final. Cupo global de la beta: 200 MB.</p><label className="forum-check"><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)} /><span>He leído las normas actuales y cuento con los derechos y consentimiento de todas las personas adultas representadas. No adjunto documentos privados.</span></label><label className="forum-check"><input type="checkbox" checked={watermark} disabled={busy} onChange={event=>setWatermark(event.target.checked)} /><span>Añadir marca de agua Chile3X</span></label><ActionButton className="button button-outline" type="button" disabled={busy||!consent} onClick={()=>fileInput.current?.click()}>{busy?'Preparando y subiendo…':'Elegir adjuntos para revisión'}</ActionButton><input ref={fileInput} type="file" hidden aria-label="Archivos adjuntos del foro" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple disabled={busy||!consent} onChange={event=>void upload(event.currentTarget)} />{notice&&<p className="forum-plain-text" role="status">{notice}</p>}</div>;
}
