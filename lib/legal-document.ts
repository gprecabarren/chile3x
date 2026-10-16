export type LegalKey='terms'|'privacy';
export type LegalBlock={id:string;type:'paragraph'|'subheading'|'list'|'callout'|'sources';text:string;items?:string[];ordered?:boolean;numbered?:boolean};
export type LegalSection={id:string;title:string;blocks:LegalBlock[]};
export type LegalDocument={title:string;description:string;summary:string;notice:string;sections:LegalSection[]};
export const INITIAL_LEGAL_VERSION='2026.10.14.3';
export const INITIAL_LEGAL_DATE='2026-10-14';
export const LEGAL_PATHS={terms:'/terminos',privacy:'/privacidad'} as const;
export function legalKey(value:unknown):LegalKey|null{return value==='terms'||value==='privacy'?value:null;}
export function legalHref(value:string):string|null{
 if(value.length>1800||/[\s\\\u0000-\u001f]/.test(value))return null;
 if(/^#[a-zA-Z][\w-]*$/.test(value)||value.startsWith('/')&&!value.startsWith('//'))return value;
 if(/^mailto:[^@?]+@[^@?]+\.[^@?]+$/.test(value))return value;
 try{const url=new URL(value);return /^https?:$/.test(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function validateLegalDocument(value:unknown,requireContent=false):LegalDocument{
 const fail=(message:string):never=>{throw new Error(message);};
 const record=(input:unknown):Record<string,unknown>=>input&&typeof input==='object'&&!Array.isArray(input)?input as Record<string,unknown>:fail('El documento no tiene un formato válido.');
 const string=(input:unknown,max:number,label:string,required=false)=>typeof input==='string'&&input.length<=max&&(!required||input.trim().length>0)?input:fail(`Revisa ${label}${required?': no puede quedar vacío':''}.`);
 const id=(value:unknown)=>typeof value==='string'&&/^[a-zA-Z][\w-]{0,100}$/.test(value)?value:fail('Hay un identificador de sección o bloque no válido.');
 const root=record(value);if(JSON.stringify(root).length>180_000)fail('El documento es demasiado extenso.');
 if(!Array.isArray(root.sections)||root.sections.length<1||root.sections.length>80)fail('El documento debe tener entre 1 y 80 secciones.');
 const sections:LegalSection[]=(root.sections as unknown[]).map(raw=>{
  const section=record(raw);if(!Array.isArray(section.blocks)||section.blocks.length>100||requireContent&&!section.blocks.length)fail('Revisa los bloques de cada sección.');
  const blocks:LegalBlock[]=(section.blocks as unknown[]).map(rawBlock=>{
   const block=record(rawBlock),type=block.type;
   if(type!=='paragraph'&&type!=='subheading'&&type!=='list'&&type!=='callout'&&type!=='sources')return fail('Tipo de bloque no permitido.');
   const text=string(block.text,12000,'el texto del bloque',requireContent&&type!=='list');
   let items:string[]|undefined;
   if(type==='list'||type==='sources'){
    if(!Array.isArray(block.items)||block.items.length>120)fail('Revisa los elementos de la lista.');
    items=(block.items as unknown[]).map(item=>string(item,5000,'los elementos de la lista',requireContent));
    if(requireContent&&!items.length)fail('Las listas deben incluir al menos un elemento.');
   }
   for(const content of [text,...items??[]])for(const match of content.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g))if(!legalHref(match[1]))fail('Hay un enlace no válido. Usa una ruta del sitio, http(s) o mailto.');
   return {id:id(block.id),type,text,...items?{items}:{},...(type==='list'?{ordered:block.ordered===true}:{}),...(type==='subheading'?{numbered:block.numbered===true}:{})};
  });
  if(new Set(blocks.map(block=>block.id)).size!==blocks.length)fail('Hay bloques duplicados en una sección.');
  return {id:id(section.id),title:string(section.title,220,'el título de la sección',requireContent),blocks};
 });
 if(new Set(sections.map(section=>section.id)).size!==sections.length)fail('Cada sección debe tener un enlace único.');
 return {title:string(root.title,160,'el título',true),description:string(root.description,320,'la descripción SEO',requireContent),summary:string(root.summary,5000,'el resumen'),notice:string(root.notice,5000,'el aviso de contacto'),sections};
}
