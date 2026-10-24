"use client";
import {useState,type FormEvent} from "react";
import "../content-editor.css";
import {ActionAnchor,ActionButton} from "@/app/ActionButton";
import {HOME_TEXT_FIELDS,HOME_REQUIRED_TEXT_FIELDS,type HomeTexts,type HomeTextKey} from "@/lib/home-content-policy";
export function HomeTextEditor({classic,compact,revision}:{classic:HomeTexts;compact:HomeTexts;revision:number}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;
    const values=new FormData(event.currentTarget),body=new FormData();body.set("review_key","settings:site");body.set("review_revision",String(revision));body.set("return_to","/admin/contenido/inicio");
    for(const layout of ["classic","compact"]){const copy=Object.fromEntries(Object.keys(HOME_TEXT_FIELDS).map(key=>[key,String(values.get(`${layout}:${key}`)??"")]));body.set(`home_content_${layout}`,JSON.stringify(copy));}
    setBusy(true);setError("");
    try{const response=await fetch("/api/admin/settings",{method:"POST",body,headers:{accept:"application/json"}});const text=await response.text();if(!response.ok){let message=text;try{message=JSON.parse(text).error??text;}catch{}throw new Error(message.length<700&&!message.startsWith("<")?message:"No se pudo confirmar el guardado. Consulta la versión actual antes de repetirlo.");}const result=JSON.parse(text);if(result.redirectTo)location.assign(result.redirectTo);}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo guardar el contenido.");setBusy(false);}
  }
  return <form className="home-text-editor" onSubmit={event=>void save(event)} onInvalidCapture={event=>{(event.target as HTMLElement).closest("details")?.setAttribute("open","");}}>
    <div className="content-editor-actions"><ActionButton className="button button-primary" disabled={busy} type="submit">{busy?"Guardando…":"Guardar textos y SEO de ambos home"}</ActionButton><ActionAnchor className="button button-outline" href="/admin/testing?seccion=inicio">Elegir diseño activo · Testing</ActionAnchor></div>
    {error&&<p className="admin-notice" role="alert">{error}</p>}
    <p className="admin-note">Solo texto, sin HTML ni scripts. El título H1, los enlaces de ciudades y la URL canónica / se conservan. Los cambios del diseño activo se publican al guardar; el otro no aparece en el HTML público. Los campos de una sección que no existe en ese diseño no se muestran en ese home.</p>
    {([['classic',classic],['compact',compact]] as const).map(([layout,copy])=><details className="content-editor-card" key={layout} open={layout==="classic"}><summary><strong>{layout==="classic"?"Home actual · clásico":"Home compacto · ciudades"}</strong></summary><div className="content-editor-actions"><ActionAnchor className="button button-outline" href={`/admin/vista-previa-inicio/${layout}`} target="_blank" rel="noreferrer">Ver diseño guardado</ActionAnchor></div>{(['content','search'] as const).map(group=><fieldset className={`home-editor-group content-tone-${group}`} key={group}><legend>{group==='content'?'Textos visibles de esta portada':'SEO y enlaces compartidos de esta portada'}</legend><p>{group==='content'?'Encabezados, párrafos y etiquetas que se leen dentro de la página.':'Solo título y descripción para buscadores y redes. No cambia el H1 ni los párrafos visibles.'}</p><div className="home-text-fields">{Object.entries(HOME_TEXT_FIELDS).filter(([key])=>['seoTitle','seoDescription','socialTitle','socialDescription'].includes(key)===(group==='search')).map(([key,[label,,max]])=><label key={key}>{label}{max>180?<textarea name={`${layout}:${key}`} rows={3} maxLength={max} defaultValue={copy[key as HomeTextKey]}/>:<input name={`${layout}:${key}`} maxLength={max} defaultValue={copy[key as HomeTextKey]} required={HOME_REQUIRED_TEXT_FIELDS.has(key as HomeTextKey)}/>}<small>Máximo {max} caracteres.</small></label>)}</div></fieldset>)}</details>)}
    <ActionButton className="button button-primary" disabled={busy} type="submit">{busy?"Guardando…":"Guardar textos y SEO de ambos home"}</ActionButton>
  </form>;
}
