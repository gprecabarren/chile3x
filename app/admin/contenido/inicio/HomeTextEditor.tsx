"use client";
import {useState,type FormEvent} from "react";
import "../content-editor.css";
import {ActionAnchor,ActionButton} from "@/app/ActionButton";
import {HOME_TEXT_FIELDS,HOME_REQUIRED_TEXT_FIELDS,type HomeTexts,type HomeTextKey} from "@/lib/home-content-policy";
import type {HomeLayout} from "@/lib/home-layout-policy";
const SEO_FIELD_LABELS:Partial<Record<HomeTextKey,string>>={seoTitle:"Título SEO de esta portada (pestaña y buscadores)",seoDescription:"Descripción SEO de esta portada",socialTitle:"Título al compartir esta portada",socialDescription:"Descripción al compartir esta portada"};
const FIELD_HELP:Partial<Record<HomeTextKey,string>>={
  seoTitle:"Este es el título que manda para / cuando este diseño está activo. El título de respaldo global no lo sustituye. No cambia el H1 visible.",
  seoDescription:"Esta descripción tiene prioridad sobre la global en la portada activa. No cambia el párrafo de introducción visible.",
  socialTitle:"Título de la tarjeta al compartir esta portada. Si lo dejas vacío se usa el título SEO de este diseño, no el respaldo global.",
  socialDescription:"Descripción de la tarjeta social. Si la dejas vacía se usa la descripción SEO de este diseño.",
  title:"Este es el encabezado H1 que se lee dentro de la página. Cambiarlo no cambia automáticamente el título SEO.",
  titleAccent:"Continuación visual del mismo H1. No es otro título SEO.",
};
export function HomeTextEditor({classic,compact,revision,activeLayout}:{classic:HomeTexts;compact:HomeTexts;revision:number;activeLayout:HomeLayout}) {
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
    <p className="admin-note">Solo texto, sin HTML ni scripts. Se conserva la estructura de encabezados, los enlaces de ciudades y la URL canónica /. Al guardar se actualizan los dos diseños: el activo se publica y el inactivo queda guardado sin aparecer en el HTML público. Una sección que no existe en un diseño no se muestra en ese Home.</p>
    {([['classic',classic],['compact',compact]] as const).map(([layout,copy])=><details className="content-editor-card" key={layout} open={layout===activeLayout}>
      <summary><strong>{layout==="classic"?"Home clásico":"Home compacto · ciudades"} · {layout===activeLayout?"ACTIVO en la web":"INACTIVO · guardado para otro momento"}</strong></summary>
      <div className="content-editor-actions"><ActionAnchor className="button button-outline" href={`#home-${layout}-content`}>Ir a textos visibles</ActionAnchor><ActionAnchor className="button button-outline" href={`#home-${layout}-search`}>Ir a SEO y redes</ActionAnchor><ActionAnchor className="button button-outline" href={`/admin/vista-previa-inicio/${layout}`} target="_blank" rel="noreferrer">Ver diseño guardado</ActionAnchor></div>
      {(['content','search'] as const).map(group=><fieldset id={`home-${layout}-${group}`} className={`home-editor-group content-tone-${group}`} key={group}>
        <legend>{group==='content'?'Textos visibles de esta portada':'SEO y enlaces compartidos de esta portada'}</legend>
        <p>{group==='content'?'Encabezados, párrafos y etiquetas que se leen dentro de la página. No cambian automáticamente los campos SEO.':`Estos metadatos tienen prioridad sobre los respaldos globales. ${layout===activeLayout?'Este es el diseño activo: se aplican al Home al guardar.':'Este diseño está inactivo: se usarán cuando lo actives en Testing.'} No cambian el H1 ni los párrafos visibles.`}</p>
        <div className="home-text-fields">{Object.entries(HOME_TEXT_FIELDS).filter(([key])=>['seoTitle','seoDescription','socialTitle','socialDescription'].includes(key)===(group==='search')).map(([key,[label,,max]])=>{
          const field=key as HomeTextKey,helpId=`home-${layout}-${key}-help`;
          return <label key={key}>{SEO_FIELD_LABELS[field]??label}{max>180?<textarea name={`${layout}:${key}`} aria-describedby={helpId} rows={3} maxLength={max} defaultValue={copy[field]}/>:<input name={`${layout}:${key}`} aria-describedby={helpId} maxLength={max} defaultValue={copy[field]} required={HOME_REQUIRED_TEXT_FIELDS.has(field)}/>}<small id={helpId}>{FIELD_HELP[field]}{FIELD_HELP[field]?' ':''}Máximo {max} caracteres.</small></label>;
        })}</div>
      </fieldset>)}
    </details>)}
    <ActionButton className="button button-primary" disabled={busy} type="submit">{busy?"Guardando…":"Guardar textos y SEO de ambos home"}</ActionButton>
  </form>;
}
