"use client";
import {useEffect,useState,type FormEvent} from "react";
import {ActionButton,ActionAnchor} from "@/app/ActionButton";
import {SampleDeleteAction} from "./SampleDeleteAction";
type Target={ownerId:string;email:string;displayName:string;revision:number;escortCount:number};
type Result={error?:string;revision?:number;url?:string;expiresAt?:number;redirectTo?:string;additionalEscortConfirmation?:boolean;target?:Target};
export function SampleActions({id,revision,handle,shared,expiresAt,trashed=false,legacyLink=false}:{id:string;revision:number;handle?:string|null;shared:boolean;expiresAt:number;trashed?:boolean;legacyLink?:boolean;provenance?:string}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[link,setLink]=useState(""),[expires,setExpires]=useState(expiresAt),[currentRevision,setRevision]=useState(revision),[target,setTarget]=useState<Target|null>(null),[hasLegacy,setHasLegacy]=useState(legacyLink);
  useEffect(()=>{
    const committed=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.key===`sample:${id}`&&Number.isSafeInteger(detail.revision)){setRevision(current=>current===detail.previousRevision?detail.revision:current);setTarget(null);}};
    window.addEventListener("chile3x:own-review-commit",committed);
    return()=>window.removeEventListener("chile3x:own-review-commit",committed);
  },[id]);
  useEffect(()=>{
    if(trashed||!shared)return;
    let active=true;const body=new FormData();body.set("sample_action","get_link");body.set("review_key",`sample:${id}`);body.set("review_revision",String(revision));
    void fetch(`/api/admin/muestras/${id}`,{method:"POST",body,headers:{accept:"application/json"}}).then(async response=>{const result:Result=await response.json();if(active&&response.ok&&result.url){setLink(result.url);setExpires(result.expiresAt??expiresAt);}}).catch(()=>{});
    return()=>{active=false;};
  },[id,revision,shared,trashed,expiresAt]);
  async function send(body:FormData) {
    body.set("review_key",`sample:${id}`);body.set("review_revision",String(currentRevision));
    const response=await fetch(`/api/admin/muestras/${id}`,{method:"POST",body,headers:{accept:"application/json"}});
    let result:Result;try{result=await response.json();}catch{throw new Error("No se pudo confirmar la acción. Revisa la versión actual antes de repetirla.");}
    if(!response.ok){if(result.additionalEscortConfirmation&&result.target){setTarget(result.target);return result;}throw new Error(result.error||"No se pudo completar la acción.");}
    if(typeof result.revision==="number"&&result.revision!==currentRevision){setRevision(result.revision);window.dispatchEvent(new CustomEvent("chile3x:own-review-commit",{detail:{key:`sample:${id}`,previousRevision:currentRevision,revision:result.revision}}));}
    if(result.redirectTo)location.assign(result.redirectTo);
    return result;
  }
  async function perform(action:string,extra?:FormData) {
    if(busy)return;setBusy(true);setMessage("");
    try{const body=extra??new FormData();body.set("sample_action",action);const result=await send(body);if(result.url){setLink(result.url);setExpires(result.expiresAt??expiresAt);setHasLegacy(false);}if(result.additionalEscortConfirmation)setMessage(result.error??"Revisa y confirma el anuncio adicional.");}
    catch(error){setMessage(error instanceof Error?error.message:"No se pudo completar la acción.");}finally{setBusy(false);}
  }
  const form=(action:string)=>(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();void perform(action,new FormData(event.currentTarget));};
  return <div className="sample-actions" aria-busy={busy}>
    {message&&<p className="admin-notice" role="alert">{message}</p>}
    {busy&&<p role="status">Procesando… No cierres esta pestaña.</p>}
    {!trashed&&<>
      <section className="sample-admin-card"><h2>Compartir la presentación</h2><p>El enlace se conserva al volver a esta página. Copiarlo no cambia su vencimiento. Cualquier persona que lo reciba podrá abrir la muestra mientras esté habilitada.</p><p className="sample-link-expiry">Vence {new Date(expires).toLocaleString("es-CL",{timeZone:"America/Santiago"})} · Usuario de muestra: @{handle??id}</p><div className="sample-admin-actions"><ActionAnchor className="button button-outline" href={`/muestra/${handle??id}`} target="_blank" rel="noreferrer">Previsualizar muestra</ActionAnchor><ActionButton className="button button-primary" disabled={busy} onClick={()=>void perform("share")}>{link?"Recuperar el mismo enlace":"Obtener enlace privado"}</ActionButton><ActionButton className="button button-outline" disabled={busy} onClick={()=>void perform("extend")}>Extender 7 días</ActionButton><ActionButton className="button button-outline" disabled={busy||(!shared&&!link)} onClick={()=>{if(confirm("¿Revocar todos los enlaces de esta muestra? Dejarán de funcionar también los accesos ya abiertos."))void perform("revoke");}}>Revocar enlace</ActionButton></div>
      {link&&<div className="sample-link"><label>Enlace privado<input type="text" readOnly value={link} onFocus={event=>event.currentTarget.select()}/></label><ActionButton className="button button-outline" onClick={()=>void navigator.clipboard.writeText(link).then(()=>setMessage("Enlace copiado.")).catch(()=>setMessage("Selecciona y copia el enlace manualmente."))}>Copiar enlace privado</ActionButton></div>}
      {hasLegacy&&!link&&<details className="sample-legacy-link"><summary>Conservar un enlace creado anteriormente</summary><p>Los enlaces antiguos siguen funcionando hasta su vencimiento. Si conservas el enlace completo, guárdalo aquí para recuperarlo en futuras visitas. Obtener uno nuevo conserva también el acceso anterior vigente.</p><form onSubmit={form("adopt_link")}><label>Enlace privado anterior<input name="previous_link" type="url" autoComplete="off" required disabled={busy}/></label><ActionButton className="button button-outline" type="submit" disabled={busy}>Guardar el mismo enlace</ActionButton></form></details>}
      </section>
      <section className="sample-admin-card"><h2>Convertir en anuncio real</h2><p>La cuenta destinataria debe estar activa y tener el correo verificado. Las fotos y videos se transfieren al anuncio aprobado. Esta acción requiere la aceptación del anunciante y no concede verificación de identidad ni médica.</p><p><ActionAnchor className="button button-outline" href="/admin/cuentas" target="_blank" rel="noreferrer">Crear o buscar cuenta</ActionAnchor></p><form onSubmit={form("migrate")}><label>Correo de la cuenta destinataria<input name="owner_email" type="email" required autoComplete="off" disabled={busy} onChange={()=>setTarget(null)}/></label><label className="sample-permission"><input name="acceptance" type="checkbox" required disabled={busy}/>El anunciante aceptó la publicación y confirmé que esta cuenta le pertenece; también revisé sus fotos.</label>
      {target&&<div className="sample-conversion-warning" role="alert"><strong>Esta cuenta ya tiene {target.escortCount} anuncio{target.escortCount===1?"":"s"} Escort.</strong><p>{target.displayName} · {target.email}. Puedes autorizar este anuncio adicional de forma excepcional. Los anuncios existentes se conservan y el límite de creación del usuario sigue vigente.</p><input type="hidden" name="expected_owner_id" value={target.ownerId}/><input type="hidden" name="expected_owner_revision" value={target.revision}/><input type="hidden" name="expected_escort_count" value={target.escortCount}/><label className="sample-permission"><input type="checkbox" name="allow_additional_escort" required disabled={busy}/>Autorizo agregar este anuncio Escort a la misma cuenta.</label></div>}
      <ActionButton className="button button-primary" type="submit" disabled={busy}>{target?"Confirmar anuncio adicional y publicar":"Convertir y publicar anuncio"}</ActionButton></form></section>
    </>}
    <section className="sample-admin-card"><h2>{trashed?"Muestra en papelera":"Papelera"}</h2><p>{trashed?"Restaurar conserva el enlace anterior y habilita la muestra durante otros 7 días, salvo que el acceso haya sido revocado. La eliminación definitiva retira únicamente los archivos que aún pertenecen a la muestra.":"Enviar a papelera suspende el acceso privado y permite recuperar la muestra durante 30 días."}</p><div className="sample-admin-actions"><ActionButton className="button button-outline" disabled={busy} onClick={()=>{if(trashed||confirm("¿Enviar esta muestra a la papelera y suspender sus accesos?"))void perform(trashed?"restore":"trash");}}>{trashed?"Restaurar muestra":"Enviar a papelera"}</ActionButton></div>
    {trashed&&<SampleDeleteAction id={id} revision={currentRevision} displayName={handle?`@${handle}`:"esta muestra"}/>}</section>
  </div>;
}
