"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import "./collaboration.css";

export function AdminCollaboration({adminMode}:{adminMode:boolean}) {
  const pathname=usePathname(),search=useSearchParams();
  const [message,setMessage]=useState("");
  useEffect(()=>{
    const controller=new AbortController(),pending=new WeakSet<HTMLFormElement>(),leases=new Map<string,string>(),leasePending=new Set<string>();let refreshing=false,failedRefreshes=0,nextRefresh=0;
    const announce=(text:string)=>setMessage(text);
    async function lease(key:string,intent:string){
      const form=new FormData();form.set('key',key);form.set('intent',intent);form.set('token',leases.get(key)??'');
      const response=await fetch('/api/admin/colaboracion',{method:'POST',body:form,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15_000)])});const result=await response.json();
      if(!response.ok){if(intent==='renew')leases.delete(key);else announce(result.error??'No se pudo reservar la revisión.');return;}
      if(intent==='claim')leases.set(key,result.token);if(intent==='release')leases.delete(key);
      if(result.resources)window.dispatchEvent(new CustomEvent('chile3x:review-state',{detail:result}));
    }
    async function refresh(){
      if(!adminMode||refreshing||document.visibilityState!=='visible')return;
      if(Date.now()<nextRefresh)return;
      const keys=[...new Set([...document.querySelectorAll<HTMLElement>('[data-review-resource]')].map(node=>node.dataset.reviewResource!))].slice(0,60);if(!keys.length&&(pathname==='/admin'||!document.querySelector('.admin-sidebar')))return;
      refreshing=true;
      try{for(const key of leases.keys())await lease(key,'renew');const params=new URLSearchParams();keys.forEach(key=>params.append('key',key));
        const response=await fetch(`/api/admin/colaboracion?${params}`,{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15_000)])});if(!response.ok)throw Error();
        const result=await response.json();window.dispatchEvent(new CustomEvent('chile3x:review-state',{detail:result}));window.dispatchEvent(new CustomEvent('chile3x:moderation-counts',{detail:result.summary}));failedRefreshes=0;nextRefresh=0;
      }catch{nextRefresh=Date.now()+Math.min(120_000,30_000*2**failedRefreshes++);if(!controller.signal.aborted)announce('No pudimos comprobar las revisiones del equipo. Tus datos se conservan; el servidor volverá a comprobarlos al guardar.');}
      finally{refreshing=false;}
    }
    function action(event:Event){const {key,intent}=(event as CustomEvent).detail;if(!adminMode||!['claim','release'].includes(intent)||leasePending.has(key))return;leasePending.add(key);void lease(key,intent).then(()=>{nextRefresh=0;return refresh();}).catch(()=>announce('No se pudo completar la reserva.')).finally(()=>leasePending.delete(key));}
    function forceRefresh(){nextRefresh=0;void refresh();}
    async function submit(event:SubmitEvent){
      const form=event.target;if(!(form instanceof HTMLFormElement)||event.defaultPrevented||form.method.toLowerCase()!=='post')return;
      const scope=form.closest<HTMLElement>('[data-review-resource]'),key=form.querySelector<HTMLInputElement>('input[name="review_key"]')?.value??scope?.dataset.reviewResource;
      if(!key)return;
      const actionUrl=new URL(form.action,location.href);if(actionUrl.origin!==location.origin)return;
      event.preventDefault();if(pending.has(form))return;pending.add(form);setMessage('');
      const submitter=event.submitter instanceof HTMLButtonElement||event.submitter instanceof HTMLInputElement?event.submitter:undefined;
      const body=new FormData(form,submitter);if(!body.has('review_key')){body.set('review_key',key);body.set('review_revision',scope?.dataset.reviewRevision??'');}
      const buttons=[...form.querySelectorAll<HTMLButtonElement>('button[type="submit"]')];const previous=buttons.map(button=>button.disabled);buttons.forEach(button=>button.disabled=true);form.setAttribute('aria-busy','true');
      try{
        const response=await fetch(actionUrl,{method:'POST',body,headers:{accept:'application/json'},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(60_000)])});
        if(response.redirected){location.assign(response.url);return;}
        const plain=response.headers.get('content-type')?.includes('application/json')?null:(await response.text()).trim();
        const result=plain===null?await response.json():{error:plain.length<=600&&!plain.startsWith('<')?plain:'No se pudo confirmar el guardado. Comprueba el estado antes de repetirlo.'};
        if(!response.ok){announce(result.error??'No se pudo confirmar el guardado. Comprueba el estado antes de repetirlo.');return;}
        if(result.redirectTo){location.assign(result.redirectTo);return;}
        announce('Acción completada. Consulta la versión actual antes de realizar otra acción sobre este registro.');void refresh();
      }catch{if(!controller.signal.aborted)announce('Se interrumpió la comunicación. No repetimos la acción: consulta la versión actual para comprobar si se guardó.');}
      finally{pending.delete(form);buttons.forEach((button,index)=>button.disabled=previous[index]);form.removeAttribute('aria-busy');}
    }
    // Bubble phase respects validation/cancellation performed by the form itself.
    document.addEventListener('submit',submit);window.addEventListener('chile3x:review-action',action);document.addEventListener('visibilitychange',refresh);
    window.addEventListener('chile3x:review-refresh',forceRefresh);
    const timer=adminMode?setInterval(refresh,30_000):null;void refresh();
    return()=>{controller.abort();if(timer)clearInterval(timer);document.removeEventListener('submit',submit);window.removeEventListener('chile3x:review-action',action);document.removeEventListener('visibilitychange',refresh);
      window.removeEventListener('chile3x:review-refresh',forceRefresh);
      for(const [key,token] of leases){const body=new FormData();body.set('key',key);body.set('token',token);body.set('intent','release');void fetch('/api/admin/colaboracion',{method:'POST',body,keepalive:true}).catch(()=>{});}
    };
  },[adminMode,pathname,search]);
  return message?<aside className="collaboration-message" role="alert"><p>{message}</p><div><button type="button" onClick={()=>setMessage('')}>Seguir revisando</button><a href={pathname+((search?.toString())?'?'+search.toString():'')} target="_blank" rel="noopener noreferrer">Abrir versión actual en otra pestaña ↗</a></div></aside>:null;
}
