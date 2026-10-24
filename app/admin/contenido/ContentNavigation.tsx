"use client";
import {usePathname} from "next/navigation";
import Link from "@/app/NavigationLink";
import {ActionIcon} from "@/app/ActionIcon";
import {ADMIN_CONTENT_PATH,isAdminContentPath,ADMIN_CONTENT_SECTIONS} from "@/lib/admin-content-navigation";
export function ContentNavigation({hrefs}:{hrefs:string[]}){
 const pathname=usePathname();if(!isAdminContentPath(pathname))return null;
 return <nav className="admin-content-navigation" aria-label="Contenido del sitio"><Link prefetch={false} className="button button-outline" href={ADMIN_CONTENT_PATH} aria-current={pathname===ADMIN_CONTENT_PATH?"page":undefined}><ActionIcon name="edit"/>Contenido del sitio</Link>{ADMIN_CONTENT_SECTIONS.filter(section=>hrefs.includes(section.href)).map(section=><Link key={section.href} prefetch={false} className="button button-outline" href={section.href} aria-current={pathname===section.href?"page":undefined}><ActionIcon name={section.icon}/>{section.label}</Link>)}</nav>;
}
