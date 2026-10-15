"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- A failed router needs an independent full-page recovery link. */
export default function PageError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <main className="session-transition"><section className="session-transition-card" role="alert"><p>CHILE3X</p><h1>No pudimos cargar esta sección</h1><p>Si estabas guardando datos o subiendo un archivo, consulta primero su estado antes de volver a enviarlo.</p>{error.digest&&<p>Referencia: {error.digest}</p>}<div><button type="button" onClick={reset}>Volver a cargar la sección</button><a href="/mi-cuenta">Ir a Mi cuenta</a><a href="/">Volver al inicio</a></div></section></main>;
}
