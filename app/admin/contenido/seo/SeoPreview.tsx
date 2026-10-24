"use client";
import {useEffect,useRef,useState} from "react";
export function SeoPreview({title,description,url,indexing}:{title:string;description:string;url:string;indexing:string}) {
  const ref=useRef<HTMLDivElement>(null),[view,setView]=useState({title,description,url,indexing});
  useEffect(()=>{const form=ref.current?.closest("form");if(!form)return;const refresh=()=>{const data=new FormData(form);setView({title:String(data.get("site_title")??title),description:String(data.get("site_description")??description),url:String(data.get("site_url")??url),indexing:String(data.get("robots_indexing")??indexing)});};form.addEventListener("input",refresh);form.addEventListener("change",refresh);return()=>{form.removeEventListener("input",refresh);form.removeEventListener("change",refresh);};},[title,description,url,indexing]);
  return <div ref={ref} className="seo-snippet-preview"><strong>Vista orientativa del resultado</strong><span>{view.url}</span><h3>{view.title}</h3><p>{view.description}</p><small>{view.title.length} caracteres de título · {view.description.length} de descripción. Google puede mostrar otros textos.</small>{view.indexing==="disabled"&&<p role="alert">Atención: guardar esta selección solicitará no indexar todo el sitio público. Administración y vistas de Testing siempre quedan sin indexación.</p>}</div>;
}
