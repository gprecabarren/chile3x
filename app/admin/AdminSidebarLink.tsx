"use client";
import { usePathname } from "next/navigation";
import Link from "@/app/NavigationLink";
import type { ReactNode } from "react";
const paths:Record<string,string>={
 '/admin':'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 '/admin/anuncios-publicaciones':'M5 3h14v18H5zM8 7h8M8 11h8M8 15h5',
 '/admin/medios':'M3 4h18v16H3zM3 16l5-5 4 4 4-6 5 7M7 8h.01',
 '/admin/resenas':'M4 4h16v12H9l-5 4zM8 8h8M8 12h5',
 '/admin/reportes':'M5 21V3M5 4h14l-2 4 2 4H5',
 '/admin/bugs':'M7 8h10v10a5 5 0 0 1-10 0zM9 8V6a3 3 0 0 1 6 0v2M3 12h4M17 12h4M3 17h4M17 17h4',
 '/admin/cuentas':'M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0M5 21v-3a7 7 0 0 1 14 0v3',
 '/admin/noticias':'M4 3h13v17H4zM17 8h3v12H4M7 7h7M7 11h7M7 15h7',
 '/admin/patrocinadores':'M10 13l4-4M8 15l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0M16 9l2-2a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-5 0',
 '/admin/telegram':'M3 11l18-7-4 17-6-5-4 3v-6zM7 13l10-6',
 '/admin/actividad':'M4 12a8 8 0 1 0 3-6M4 4v6h6M12 7v5l3 2',
 '/admin/correos':'M3 5h18v14H3zM3 5l9 7 9-7',
 '/admin/configuracion':'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
 '/foro':'M3 4h14v12H7l-4 4zM17 8h4v12l-4-3',
 '/admin/administradores':'M12 2l8 3v6c0 5-4 8-8 11-4-3-8-6-8-11V5zM9 11l2 2 4-4',
 '/admin/ayuda':'M9 8a3 3 0 1 1 4 3c-1 1-1 1-1 3M12 18h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
};
export function AdminSidebarLink({href,children,className}:{href:string;children:ReactNode;className?:string}){
 const pathname=usePathname(),active=href==='/admin'?pathname===href:pathname===href||pathname?.startsWith(href+'/');
 return <Link href={href} prefetch={false} className={`${className??''}${active?' is-current':''}`} aria-current={active?'page':undefined}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[href]??paths['/admin']} /></svg><span>{children}</span></Link>;
}
