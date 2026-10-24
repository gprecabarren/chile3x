"use client";
import {useEffect,useRef,useState} from "react";
import {ActionButton} from "@/app/ActionButton";
import {SAMPLE_TOKEN} from "@/lib/private-sample-policy";
export function SampleAccess({id}:{id:string}) {
  const token=useRef(""),started=useRef(false),[error,setError]=useState(""),[busy,setBusy]=useState(true);
  async function open() {
    setBusy(true);setError("");
    try{
      if(!SAMPLE_TOKEN.test(token.current))throw new Error("Abre el enlace completo que te compartió administración. Si venció, pide uno nuevo.");
      const response=await fetch(`/muestra/${encodeURIComponent(id)}/acceso`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:token.current}),cache:"no-store",referrerPolicy:"no-referrer"});
      if(!response.ok)throw new Error("Este enlace no está disponible, venció o fue revocado. Solicita uno nuevo a administración.");
      token.current="";location.replace(`/muestra/${encodeURIComponent(id)}`);
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo abrir la muestra.");setBusy(false);}
  }
  useEffect(()=>{
    if(started.current)return;started.current=true;token.current=location.hash.slice(1);
    history.replaceState(null,"",location.pathname);void open();
  // Run once per mounted invitation; the secret stays only in memory.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[id]);
  return <main className="sample-access"><p className="eyebrow">CHILE3X · MUESTRA PRIVADA</p><h1>{busy?"Abriendo tu muestra…":"Enlace privado"}</h1><p role={error?"alert":"status"}>{error||"Estamos comprobando el acceso a esta presentación. No es un anuncio publicado."}</p>{!busy&&<ActionButton className="button button-outline" onClick={()=>void open()}>Volver a comprobar</ActionButton>}</main>;
}
