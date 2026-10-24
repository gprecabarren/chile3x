"use client";
import { ActionButton } from "@/app/ActionButton";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
export function GuideForm({ children, label }: {children:ReactNode;label:string}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(""); const router=useRouter();
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); if(busy)return; const fields=new URLSearchParams();
    for(const [key,value] of new FormData(event.currentTarget)) if(typeof value==='string')fields.set(key,value);
    setBusy(true);setError("");
    try {const response=await fetch('/api/admin/ayuda/guias',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:fields});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo guardar.');
      if(typeof result.redirectTo!=='string'||!result.redirectTo.startsWith('/admin/ayuda/guias?'))throw new Error('Revisa el resultado antes de repetir la operación.');
      router.push(result.redirectTo);router.refresh();
    } catch(error){setError(error instanceof TypeError?'Revisa tu conexión y recarga las guías antes de repetir el envío.':error instanceof Error?error.message:'No se pudo guardar.');}
    finally{setBusy(false);}
  }
  return <form className="help-guide-form" method="post" action="/api/admin/ayuda/guias" onSubmit={submit} aria-busy={busy}><fieldset disabled={busy}>{children}<ActionButton className="button button-primary" type="submit">{busy?'Guardando…':label}</ActionButton></fieldset>{error&&<p role="alert" className="form-alert">{error}</p>}</form>;
}
