"use client";
import { useEffect,useState } from "react";
export function AdminPendingCount({kind,initial}:{kind:string;initial:number}){
 const [value,setValue]=useState(initial);
 useEffect(()=>{function update(event:Event){const count=(event as CustomEvent).detail?.[kind];if(typeof count==='number')setValue(count);}window.addEventListener('chile3x:moderation-counts',update);return()=>window.removeEventListener('chile3x:moderation-counts',update);},[kind]);
 return value>0?<b aria-label={`${value} pendientes`}>{value}</b>:null;
}
