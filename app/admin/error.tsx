"use client";
import { ActionButton } from "@/app/ActionButton";
export default function AdminError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  return <main className="session-transition"><section className="session-transition-card" role="alert"><p>CHILE3X · ADMINISTRACIÓN</p><h1>No se pudo cargar esta sección</h1><p>No vuelvas a crear ni guardar el anuncio sin comprobar su estado: la acción anterior podría haberse completado.</p>{error.digest&&<p>Referencia: {error.digest}</p>}<div><ActionButton type="button" onClick={reset}>Volver a cargar esta sección</ActionButton><a href="/admin/anuncios-publicaciones">Revisar anuncios guardados</a><a href="/admin">Volver al panel</a></div></section></main>;
}
