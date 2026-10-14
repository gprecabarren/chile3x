"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ACCOUNT_FIELD_LABELS, ACCOUNT_SAVE_ERRORS, type AccountSaveFeedback } from "@/lib/account-save-feedback";
export function AccountDetailsForm({children}:{children:ReactNode}) {
 const [busy,setBusy]=useState(false),[result,setResult]=useState<AccountSaveFeedback|null>(null),[failure,setFailure]=useState("");const router=useRouter();
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;const fields=new URLSearchParams();for(const [key,value] of new FormData(event.currentTarget))if(typeof value==='string')fields.set(key,value);setBusy(true);setFailure("");setResult(null);
  try{const response=await fetch('/api/mi-cuenta/datos',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body:fields});const data=await response.json();
   if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'No se pudieron guardar los datos.');
   if(!Array.isArray(data.updated)||!Array.isArray(data.errors))throw new Error('No se pudo confirmar el resultado. Revisa tus datos antes de repetir.');
   setResult(data);router.refresh();
  }catch(error){setFailure(error instanceof TypeError?'No se pudo confirmar el guardado. Revisa tu conexión y tus datos antes de repetir.':error instanceof Error?error.message:'No se pudo guardar.');}finally{setBusy(false);}
 }
 return <form action="/api/mi-cuenta/datos" method="post" className="account-details-form" noValidate onSubmit={submit} aria-busy={busy}>
  {result&&<div className="account-save-result" aria-live="polite">{result.updated.length>0?<div className="account-success" role="status"><strong>Datos actualizados</strong><ul>{result.updated.map(field=><li key={field}>{ACCOUNT_FIELD_LABELS[field]}</li>)}</ul></div>:!result.errors.length?<p role="status">No había cambios nuevos que guardar.</p>:null}
   {result.errors.length>0&&<div className="form-alert" role="alert"><strong>Campos no actualizados</strong><ul>{result.errors.map(error=><li key={error}>{ACCOUNT_SAVE_ERRORS[error]}</li>)}</ul><p>Los datos válidos indicados arriba sí se guardaron. Corrige estos campos y vuelve a guardar.</p></div>}
  </div>}{failure&&<p className="form-alert" role="alert">{failure}</p>}
  <fieldset className="account-details-fields" disabled={busy}>{children}</fieldset>
 </form>;
}
