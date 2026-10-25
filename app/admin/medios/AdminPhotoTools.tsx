"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";
import { FacePrivacyEditor } from "@/app/mi-cuenta/FacePrivacyEditor";
import { prepareGalleryImage } from "@/app/mi-cuenta/watermark-image";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload-policy";
import { parsePhotoEditOptions, samePhotoEdit, type PhotoEditOptions } from "@/lib/photo-edit-policy";
import { readUploadResponse, uploadMediaRequest } from "@/lib/upload-response";
import "./photo-tools.css";

type Photo = {id:string;url:string;isProfilePhoto?:boolean};
type SavedState = {profileId:string;revision:number;sourceUrl:string;hasBase:boolean;lockedWatermark:boolean;lockedBlur:boolean} & PhotoEditOptions;
type Row = {saved:SavedState;options:PhotoEditOptions;source?:File;preview?:{file:File;url:string};message?:string;failed?:boolean};
type SavedResult = {revision:number;mediaId:string;options:PhotoEditOptions;quota:{bytes:number;level:"ok"|"warning"|"blocked";message:string}};
const selectedOptions=(row:SavedState):PhotoEditOptions=>({watermark:row.watermark,blur:row.blur,faceRegions:row.faceRegions});

export function AdminPhotoTools({images,profileName="este anuncio",onSaved,onBusyChange,disabled=false,sampleId}:{images:Photo[];profileName?:string;onSaved?:(result:SavedResult)=>void;onBusyChange?:(busy:boolean)=>void;disabled?:boolean;sampleId?:string}) {
  const endpoint=(id:string)=>sampleId?`/api/admin/muestras/${encodeURIComponent(sampleId)}/media/${encodeURIComponent(id)}/procesar`:`/api/admin/media/${encodeURIComponent(id)}/procesar`;
  const reviewKey=(id:string)=>`${sampleId?"sample":"profile"}:${id}`;
  const root=useRef<HTMLDetailsElement>(null),revision=useRef<number|null>(null),rowsRef=useRef<Record<string,Row>>({}),stop=useRef(false),alive=useRef(true);
  const [rows,setRows]=useState<Record<string,Row>>({}),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const ids=images.map(photo=>photo.id),idsKey=ids.join("|");
  function update(id:string,patch:Partial<Row>) {
    const previous=rowsRef.current[id];
    if(previous?.preview&&patch.preview!==undefined&&patch.preview!==previous.preview)URL.revokeObjectURL(previous.preview.url);
    rowsRef.current={...rowsRef.current,[id]:{...previous,...patch}};
    if(alive.current)setRows(rowsRef.current);
  }
  function change(id:string,options:PhotoEditOptions) {
    const row=rowsRef.current[id];if(row?.preview)URL.revokeObjectURL(row.preview.url);
    update(id,{options,preview:undefined,failed:false,message:"Opciones cambiadas; genera otra vista previa."});
  }
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;stop.current=true;for(const row of Object.values(rowsRef.current))if(row.preview)URL.revokeObjectURL(row.preview.url);};},[]);
  useEffect(()=>{
    const known=new Set(idsKey.split("|"));
    const activate=(event:Event)=>{const id=(event as CustomEvent).detail?.mediaId;if(!known.has(id))return;setOpen(true);setTimeout(()=>document.getElementById(`photo-tools-${id}`)?.scrollIntoView({block:"center",behavior:"smooth"}),0);};
    window.addEventListener("chile3x:edit-saved-photo",activate);return()=>window.removeEventListener("chile3x:edit-saved-photo",activate);
  },[idsKey]);
  useEffect(()=>{
    const ownCommit=(event:Event)=>{const detail=(event as CustomEvent).detail;if(revision.current===detail?.previousRevision&&Object.values(rowsRef.current).some(row=>`${sampleId?"sample":"profile"}:${row.saved.profileId}`===detail.key))revision.current=detail.revision;};
    window.addEventListener("chile3x:own-review-commit",ownCommit);return()=>window.removeEventListener("chile3x:own-review-commit",ownCommit);
  },[sampleId]);
  async function load(id:string) {
    if(rowsRef.current[id])return rowsRef.current[id];
    const state=await readUploadResponse<SavedState>(await fetch(endpoint(id),{cache:"no-store",signal:AbortSignal.timeout(15000)}));
    const options=parsePhotoEditOptions(JSON.stringify(state));
    const expectedSource=sampleId?`/api/admin/muestras/${encodeURIComponent(sampleId)}/media/`:"/api/admin/media/";
    if(!options||!Number.isSafeInteger(state.revision)||typeof state.profileId!=="string"||(sampleId&&state.profileId!==sampleId)||!state.sourceUrl?.startsWith(expectedSource))throw Error("La respuesta de edición no es válida.");
    if(revision.current!==null&&revision.current!==state.revision)throw Error("El anuncio cambió durante la revisión. Recarga antes de editar más fotos.");
    revision.current=state.revision;
    const row:Row={saved:state,options};update(id,row);return row;
  }
  async function source(id:string,row:Row) {
    if(row.source)return row.source;
    const response=await fetch(row.saved.sourceUrl,{cache:"no-store",signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error("No se pudo cargar la foto actual. No se modificó la imagen.");
    const blob=await response.blob();if(blob.size>MAX_IMAGE_UPLOAD_BYTES)throw Error("La foto supera 10 MB; vuelve a subir una copia optimizada.");
    const file=new File([blob],`${id}-base`,{type:blob.type});update(id,{source:file});return file;
  }
  async function run(selected:string[],operation:(id:string)=>Promise<void>) {
    if(busy||disabled)return;stop.current=false;setBusy(true);onBusyChange?.(true);setMessage("");let done=0,failed=0,failure="";
    try {for(const id of selected){if(stop.current)break;try{await operation(id);done++;}catch(cause){failed++;const text=cause instanceof Error?cause.message:"No se pudo completar esta foto.";failure=text;if(rowsRef.current[id])update(id,{message:text,failed:true});if(/cambi|confirm|conexi|interrump|HTTP 5|sesión|Cloudflare/i.test(text))break;}}
      if(!stop.current)setMessage(`${done} foto${done===1?"":"s"} revisada${done===1?"":"s"}. ${failure|| (selected.some(id=>rowsRef.current[id]?.preview)?"Las vistas previas no publican cambios: confirma las fotos preparadas.":"Consulta el estado de cada foto.")}${failed>1?` (${failed} fotos requieren atención).`:""}`);
    }finally{if(alive.current){setBusy(false);onBusyChange?.(false);}}
  }
  async function prepare(id:string,field?:"watermark"|"blur",enabled?:boolean) {
    const row=await load(id),options=field?{...row.options,[field]:enabled,...(field==="blur"&&!enabled?{faceRegions:[]}: {})}:row.options;
    if((row.saved.lockedWatermark&&!options.watermark)||(row.saved.lockedBlur&&!options.blur))throw Error("Esta foto antigua ya tenía ese efecto incorporado. Necesitas una copia limpia para quitarlo.");
    change(id,options);
    if(samePhotoEdit(options,selectedOptions(row.saved))){update(id,{message:"Ya tiene estas opciones; no se añade otra marca ni se vuelve a guardar."});return;}
    const original=await source(id,rowsRef.current[id]);
    const result=!options.watermark&&!options.blur?{file:original}:await prepareGalleryImage(original,{maxBytes:MAX_IMAGE_UPLOAD_BYTES,maxDimension:2200,applyWatermark:options.watermark&&!row.saved.lockedWatermark,blurFaces:options.blur&&(!row.saved.lockedBlur||options.faceRegions.length>0),faceRegions:options.faceRegions,onProgress:detail=>update(id,{message:detail})});
    if(stop.current||!alive.current)return;
    update(id,{preview:{file:result.file,url:URL.createObjectURL(result.file)},failed:false,message:"Vista previa lista. Revisa rostros y otros detalles antes de guardar."});
  }
  async function save(id:string) {
    const row=rowsRef.current[id];if(!row?.preview||revision.current===null)return;
    const before=revision.current,data=new FormData();data.set("review_key",reviewKey(row.saved.profileId));data.set("review_revision",String(before));data.set("mutation_id",crypto.randomUUID());data.set("options",JSON.stringify(row.options));
    data.set("file",row.preview.file);
    const result=await uploadMediaRequest<SavedResult>(endpoint(id),data);
    if(!Number.isSafeInteger(result.revision)||result.mediaId!==id)throw Error("No se confirmó la edición. Revisa la foto antes de repetir.");
    revision.current=result.revision;
    URL.revokeObjectURL(row.preview.url);update(id,{saved:{...row.saved,...row.options,hasBase:true,revision:result.revision},preview:undefined,failed:false,message:"Foto final guardada, sin copias extra. Puedes deshacer desde esta pestaña mientras siga abierta."});
    window.dispatchEvent(new CustomEvent("chile3x:own-review-commit",{detail:{key:reviewKey(row.saved.profileId),previousRevision:before,revision:result.revision}}));onSaved?.(result);
  }
  const prepared=ids.filter(id=>!!rows[id]?.preview);
  return <details ref={root} className="saved-photo-tools" open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>{images.length===1?"Editar marca de agua y difuminado":"Editar fotos guardadas · principal y galería"}</summary>
    {open&&<div className="saved-photo-tools-content"><p>Edita las fotos de {profileName}{sampleId?", manteniéndolas privadas":" sin cambiar su aprobación"}. Solo se guarda la foto final en el servidor. Esta pestaña conserva temporalmente la foto de partida para deshacer cambios; al cerrarla o recargarla se pierde esa posibilidad. Los efectos ya incorporados requieren una copia limpia para poder quitarlos.</p>
      {images.length>1&&<div className="saved-photo-bulk-actions" aria-label="Opciones para todas las fotos guardadas">
        <ActionButton type="button" className="button button-outline" disabled={busy||disabled} onClick={()=>run(ids,id=>prepare(id,"watermark",true))}><ActionIcon name="image" />Marca de agua en todas</ActionButton>
        <ActionButton type="button" className="button button-outline" disabled={busy||disabled} onClick={()=>run(ids,id=>prepare(id,"blur",true))}><ActionIcon name="eye" />Difuminar rostros en todas</ActionButton>
        <ActionButton type="button" className="button button-outline" disabled={busy||disabled} onClick={()=>run(ids,id=>prepare(id,"watermark",false))}>Quitar marcas de todas</ActionButton>
        <ActionButton type="button" className="button button-outline" disabled={busy||disabled} onClick={()=>run(ids,id=>prepare(id,"blur",false))}>Quitar difuminado de todas</ActionButton>
      </div>}
      {message&&<p role="status">{message}</p>}
      {busy&&<ActionButton type="button" className="button button-outline" onClick={()=>{stop.current=true;setMessage("Se detendrá al terminar la foto actual. Las ya guardadas se conservan; no se repetirán.");}}>Detener después de esta foto</ActionButton>}
      <div className="saved-photo-grid">{images.map((photo,index)=>{const row=rows[photo.id];return <article id={`photo-tools-${photo.id}`} key={photo.id} className={row?.failed?"has-error":""}>
        <h4>{photo.isProfilePhoto?"Foto principal":`Foto ${index+1}`}</h4>
        <Image src={row?.preview?.url??(row?.saved.hasBase?`${photo.url}${photo.url.includes("?")?"&":"?"}edit=${row.saved.revision}`:photo.url)} alt={row?.preview?"Vista previa de los efectos sin guardar":"Foto guardada del anuncio"} width={280} height={220} unoptimized loading="lazy" />
        {!row?<ActionButton type="button" className="button button-outline" disabled={busy||disabled} onClick={()=>run([photo.id],async id=>{const loaded=await load(id);await source(id,loaded);})}>Cargar opciones de esta foto</ActionButton>:<>
          <div className="saved-photo-options"><label><input type="checkbox" checked={row.options.watermark} disabled={busy||disabled||row.saved.lockedWatermark} onChange={event=>change(photo.id,{...row.options,watermark:event.target.checked})} />Marca de agua</label><label><input type="checkbox" checked={row.options.blur} disabled={busy||disabled||row.saved.lockedBlur} onChange={event=>change(photo.id,{...row.options,blur:event.target.checked,faceRegions:event.target.checked?row.options.faceRegions:[]})} />Difuminar rostros</label></div>
          {row.options.blur&&row.source&&<FacePrivacyEditor file={row.source} regions={row.options.faceRegions} disabled={busy||disabled} onChange={faceRegions=>change(photo.id,{...row.options,faceRegions})} />}
          {(row.saved.lockedBlur||row.saved.lockedWatermark)&&<small>Efecto antiguo incorporado: para quitarlo, sube una copia limpia.</small>}
          <ActionButton type="button" className="button button-outline" disabled={busy||disabled} onClick={()=>run([photo.id],id=>prepare(id))}>Generar vista previa</ActionButton>
          {row.preview&&<><span className="saved-photo-preview-label">Vista previa sin guardar</span><ActionButton type="button" className="button button-primary" disabled={busy||disabled} onClick={()=>run([photo.id],save)}>Confirmar esta foto</ActionButton><ActionButton type="button" className="button button-outline" disabled={busy||disabled} onClick={()=>change(photo.id,selectedOptions(row.saved))}>Descartar vista previa</ActionButton></>}
          <ActionButton type="button" className="button button-outline" disabled={busy||disabled||!row.saved.hasBase||row.saved.lockedBlur||row.saved.lockedWatermark} onClick={()=>run([photo.id],async id=>{change(id,{watermark:false,blur:false,faceRegions:[]});await prepare(id);})}>Deshacer efectos de esta pestaña</ActionButton>
        </>}
        {row?.message&&<p role="status">{row.message}</p>}
      </article>;})}</div>
      {prepared.length>1&&<ActionButton type="button" className="button button-primary" disabled={busy||disabled} onClick={()=>run(prepared,save)}>Confirmar {prepared.length} fotos preparadas</ActionButton>}
    </div>}
  </details>;
}
