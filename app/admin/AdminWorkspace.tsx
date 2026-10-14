"use client";

import { useEffect,useRef,useState,type ReactNode } from "react";
import Link from "@/app/NavigationLink";
import "./admin-workspace.css";

export function AdminWorkspace({brand,navigation,identity,children}:{brand:ReactNode;navigation:ReactNode;identity:ReactNode;children:ReactNode}){
 const [collapsed,setCollapsed]=useState(false),[mobileOpen,setMobileOpen]=useState(false);
 const sidebar=useRef<HTMLElement>(null),mobileToggle=useRef<HTMLButtonElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const media=window.matchMedia('(min-width:1100px)');const changed=()=>{if(media.matches)setMobileOpen(false);};media.addEventListener('change',changed);return()=>media.removeEventListener('change',changed);},[]);
 useEffect(()=>{
  if(!mobileOpen)return;
  const previousOverflow=document.body.style.overflow,returnFocusTarget=mobileToggle.current;document.body.style.overflow='hidden';
  const focusFrame=requestAnimationFrame(()=>closeButton.current?.focus());
  function keydown(event:KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();setMobileOpen(false);return;}
   if(event.key!=='Tab')return;
   const controls=[...(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')??[])].filter(element=>element.getClientRects().length>0);
   const first=controls[0],last=controls.at(-1);if(!first)return;
   if(event.shiftKey&&(document.activeElement===first||!sidebar.current?.contains(document.activeElement))){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||!sidebar.current?.contains(document.activeElement))){event.preventDefault();first.focus();}
  }
  document.addEventListener('keydown',keydown);
  return()=>{cancelAnimationFrame(focusFrame);document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',keydown);returnFocusTarget?.focus({preventScroll:true});};
 },[mobileOpen]);
 const hamburger=<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
 return <div className={`admin-workspace${collapsed?' is-desktop-collapsed':''}${mobileOpen?' is-mobile-open':''}`}>
  {mobileOpen&&<button className="admin-sidebar-backdrop" aria-label="Cerrar menú administrativo" type="button" onClick={()=>setMobileOpen(false)} />}
  <aside className="admin-sidebar" id="admin-sidebar" ref={sidebar} role={mobileOpen?'dialog':undefined} aria-modal={mobileOpen||undefined} aria-label="Menú administrativo" inert={collapsed&&!mobileOpen||undefined} onClick={event=>{if(event.target instanceof Element&&event.target.closest('a[href]'))setMobileOpen(false);}}>
   <div className="admin-sidebar-head">{brand}<button className="admin-drawer-close" type="button" ref={closeButton} aria-label="Cerrar menú administrativo" onClick={()=>setMobileOpen(false)}>×</button></div>
   <div className="admin-sidebar-navigation">{navigation}</div>
   <footer className="admin-sidebar-footer">{identity}</footer>
  </aside>
  <main className="admin-root" inert={mobileOpen||undefined}>
   <header className="admin-toolbar">
    <button className="admin-desktop-toggle" type="button" aria-label={collapsed?'Expandir menú administrativo':'Contraer menú administrativo'} aria-expanded={!collapsed} aria-controls="admin-sidebar" onClick={()=>setCollapsed(value=>!value)}>{hamburger}</button>
    <button className="admin-mobile-toggle" type="button" ref={mobileToggle} aria-label="Abrir menú administrativo" aria-expanded={mobileOpen} aria-controls="admin-sidebar" onClick={()=>setMobileOpen(true)}>{hamburger}</button>
    <div className="admin-toolbar-brand">{brand}</div><span className="admin-toolbar-label">Administración</span><Link className="admin-view-site" href="/">Ver sitio <span aria-hidden="true">↗</span></Link>
   </header>
   {children}
  </main>
 </div>;
}
