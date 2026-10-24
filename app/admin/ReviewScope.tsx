"use client";
import { ActionButton } from "@/app/ActionButton";
import { useEffect, useState, type ReactNode } from "react";
type State = {revision:number|null;actorId:string|null;actor:string|null;expiresAt:number|null};
export function ReviewScope({resource,revision,children}:{resource:string;revision:number;children:ReactNode}) {
  const [state,setState]=useState<State|null>(null),[mine,setMine]=useState(false),[localRevision,setLocalRevision]=useState(revision);
  useEffect(()=>{
    function update(event:Event){const detail=(event as CustomEvent).detail;const row=detail?.resources?.find((item:State&{key:string})=>item.key===resource);if(row){setState(row);setMine(row.actorId===detail.actorId);}}
    function ownCommit(event:Event){const detail=(event as CustomEvent).detail;if(detail?.key===resource&&Number.isSafeInteger(detail.revision))setLocalRevision(current=>current===detail.previousRevision?detail.revision:current);}
    window.addEventListener('chile3x:review-state',update);window.addEventListener('chile3x:own-review-commit',ownCommit);return()=>{window.removeEventListener('chile3x:review-state',update);window.removeEventListener('chile3x:own-review-commit',ownCommit);};
  },[resource]);
  // A poll started before our own upload may arrive after its commit.
  const stale=state!==null&&(state.revision===null||state.revision>localRevision);
  const request=(intent:string)=>window.dispatchEvent(new CustomEvent('chile3x:review-action',{detail:{key:resource,intent}}));
  return <div data-review-resource={resource} data-review-revision={localRevision} className="review-scope">
    <div className={`review-coordination${stale?' is-stale':''}`} role="status">
      <span>{stale?'Hay cambios nuevos. Tu formulario no se actualizará ni sobrescribirá automáticamente.':state?.actorId?mine?'Tienes esta revisión reservada.':`${state.actor} está revisando este registro.`:'Revisión compartida · Disponible para reservar.'}</span>
      <ActionButton type="button" className="button button-outline" onClick={()=>request(mine?'release':'claim')} disabled={!!state?.actorId&&!mine}>{mine?'Liberar revisión':'Tomar revisión'}</ActionButton>
    </div>{children}
  </div>;
}
