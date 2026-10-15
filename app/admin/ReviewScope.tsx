"use client";
import { useEffect, useState, type ReactNode } from "react";
type State = {revision:number|null;actorId:string|null;actor:string|null;expiresAt:number|null};
export function ReviewScope({resource,revision,children}:{resource:string;revision:number;children:ReactNode}) {
  const [state,setState]=useState<State|null>(null),[mine,setMine]=useState(false);
  useEffect(()=>{
    function update(event:Event){const detail=(event as CustomEvent).detail;const row=detail?.resources?.find((item:State&{key:string})=>item.key===resource);if(row){setState(row);setMine(row.actorId===detail.actorId);}}
    window.addEventListener('chile3x:review-state',update);return()=>window.removeEventListener('chile3x:review-state',update);
  },[resource]);
  const stale=state!==null&&state.revision!==revision;
  const request=(intent:string)=>window.dispatchEvent(new CustomEvent('chile3x:review-action',{detail:{key:resource,intent}}));
  return <div data-review-resource={resource} data-review-revision={revision} className="review-scope">
    <div className={`review-coordination${stale?' is-stale':''}`} role="status">
      <span>{stale?'Hay cambios nuevos. Tu formulario no se actualizará ni sobrescribirá automáticamente.':state?.actorId?mine?'Tienes esta revisión reservada.':`${state.actor} está revisando este registro.`:'Revisión compartida · Puedes reservar este registro para coordinarte con el equipo.'}</span>
      <button type="button" className="button button-outline" onClick={()=>request(mine?'release':'claim')} disabled={!!state?.actorId&&!mine}>{mine?'Liberar revisión':'Tomar revisión'}</button>
    </div>{children}
  </div>;
}
