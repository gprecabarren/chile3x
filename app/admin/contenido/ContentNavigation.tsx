'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from '@/app/NavigationLink';
import { ActionIcon } from '@/app/ActionIcon';
import { ADMIN_CONTENT_PATH, ADMIN_CONTENT_GROUPS, ADMIN_CONTENT_SECTIONS, activeAdminContentSection, isAdminContentPath } from '@/lib/admin-content-navigation';

export function ContentNavigation({ hrefs }: { hrefs: string[] }) {
  const pathname = usePathname(), router = useRouter();
  if (!isAdminContentPath(pathname)) return null;
  const sections = ADMIN_CONTENT_SECTIONS.filter(section => hrefs.includes(section.href));
  const active = activeAdminContentSection(pathname);
  const current = sections.find(section => section.href === active?.href);
  const overview = pathname === ADMIN_CONTENT_PATH;
  return <nav className="admin-content-navigation" aria-label="Editores de contenido del sitio">
    <div className="admin-content-location">
      <Link className="admin-content-home" href={ADMIN_CONTENT_PATH} aria-current={overview ? 'page' : undefined}><ActionIcon name="grid"/><span>Contenido del sitio<small>Índice de editores</small></span></Link>
      <div className="admin-content-current"><span>Estás en</span><strong>{overview ? 'Índice de contenido' : current?.label ?? 'Editor de contenido'}</strong>{current ? <small>{current.scope}</small> : null}</div>
    </div>
    <div className="admin-content-nav-groups">{ADMIN_CONTENT_GROUPS.map(group => {
      const entries = sections.filter(section => section.group === group.id);
      return entries.length ? <div className={`admin-content-nav-group content-tone-${group.id}`} key={group.id}><p><ActionIcon name={group.icon}/>{group.label}</p><div>{entries.map(section => <Link className="button button-outline" key={section.href} href={section.href} aria-current={current?.href === section.href ? 'page' : undefined}><ActionIcon name={section.icon}/>{section.label}{current?.href === section.href ? <small className="admin-content-active-mark">Actual</small> : null}</Link>)}</div></div> : null;
    })}</div>
    <label className="admin-content-mobile-switch">Cambiar de editor<select value={current?.href ?? ADMIN_CONTENT_PATH} onChange={event => { const href = event.target.value; if (href === ADMIN_CONTENT_PATH || sections.some(section => section.href === href)) router.push(href); }}><option value={ADMIN_CONTENT_PATH}>Índice de contenido</option>{ADMIN_CONTENT_GROUPS.map(group => { const entries = sections.filter(section => section.group === group.id); return entries.length ? <optgroup key={group.id} label={group.label}>{entries.map(section => <option key={section.href} value={section.href}>{section.label}</option>)}</optgroup> : null; })}</select></label>
  </nav>;
}
