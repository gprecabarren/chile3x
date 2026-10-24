import { ActionButton } from "@/app/ActionButton";
import Link from "@/app/NavigationLink";
import { AdminPageHeading, AdminShell } from "@/app/admin/_components";
import { getForumSections, getForumTopicPage, requireForumAdmin } from "@/lib/forum";
import { FORUM_LIMITS, forumPage, forumSearch } from "@/lib/forum-policy";
import { ForumDate, ForumNavigation, ForumPagination } from "./_components";

export default async function ForumPage({ searchParams }: { searchParams: Promise<{ q?: string; seccion?: string; pagina?: string; papelera?: string }> }) {
  const admin = await requireForumAdmin();
  const query = await searchParams; const search = forumSearch(query.q); const page = forumPage(query.pagina); const trash = query.papelera === "1";
  const [sections, topics] = await Promise.all([getForumSections(), getForumTopicPage({ sectionId: query.seccion?.slice(0, 80), search, page, trash })]);
  const selected = sections.find(section => section.id === query.seccion);
  const groups = [...new Set(sections.filter(section => !section.isArchived).map(section => section.groupName))];
  const filters = { ...(search ? { q: search } : {}), ...(selected ? { seccion: selected.id } : {}), ...(trash ? { papelera: "1" } : {}) };
  return <AdminShell user={admin}><div className="admin-content forum-root">
    <AdminPageHeading eyebrow="COMUNIDAD CHILE3X" title="Foro" description="La comunidad comienza aquí. Una beta privada para construir, organizar y probar antes de abrirla." backHref="/admin" />
    <ForumNavigation />
    <div className="forum-stats"><span><strong>{sections.filter(s => !s.isArchived).length}</strong> secciones activas</span><span><strong>{sections.reduce((sum, s) => sum + s.topics, 0)}</strong> temas en el foro</span><span>Acceso <strong>privado</strong></span></div>
    <form action="/foro" method="get" className="forum-search" role="search"><label>Buscar temas y respuestas<input type="search" name="q" maxLength={FORUM_LIMITS.query} defaultValue={search} placeholder="Escribe una palabra o una consulta" /></label><label>Sección<select name="seccion" defaultValue={selected?.id ?? ""}><option value="">Todas las secciones</option>{sections.map(s => <option value={s.id} key={s.id}>{s.title}{s.isArchived ? " (archivada)" : ""}</option>)}</select></label>{trash && <input type="hidden" name="papelera" value="1" />}<ActionButton type="submit" className="button button-outline">Buscar</ActionButton></form>
    <div className="forum-home-grid"><div>
      {!search && !selected && !trash && groups.map((group, index) => <details className="forum-group" key={group} open={index === 0 || group === "Regiones de Chile"}><summary><span>{group}</span><small>{sections.filter(s => !s.isArchived && s.groupName === group).length} secciones</small></summary><div>{sections.filter(s => !s.isArchived && s.groupName === group).map(s => <Link className="forum-section-row" href={`/foro?seccion=${s.id}`} key={s.id}><span className="forum-section-icon" aria-hidden="true">▤</span><span><strong>{s.title}</strong><small>{s.description}</small></span><b>{s.topics}<small>temas</small></b></Link>)}</div></details>)}
      <section className="forum-topic-list"><header><h2>{trash ? "Temas en papelera" : selected ? selected.title : search ? "Resultados de búsqueda" : "Última actividad"}</h2><span>{topics.total} temas</span></header>
        {selected && <><p>{selected.description}</p>{selected.isArchived && <p className="forum-beta-notice">Esta sección está archivada. Puede consultarse, pero no admite temas ni respuestas nuevos.</p>}{selected.rules && <p className="forum-plain-text">{selected.rules}</p>}<Link className="button button-outline" href={`/foro/nuevo?seccion=${selected.id}`}>Crear un tema aquí</Link></>}
        {topics.rows.length ? topics.rows.map(topic => <Link className="forum-topic-row" href={`/foro/tema/${topic.id}`} key={topic.id}><span><strong>{topic.isPinned ? "📌 " : ""}{topic.title}</strong><small>{topic.sectionTitle} · {topic.authorName}{topic.isLocked ? " · Cerrado" : ""}{topic.trashedAt ? " · Papelera" : ""}</small></span><span><b>{Math.max(0, topic.posts - 1)} respuestas</b><ForumDate value={topic.updatedAt} /></span></Link>) : <p className="forum-empty">{search ? "No se encontraron coincidencias. Pruebe otra palabra o sección." : "Todavía no hay temas en esta vista. Puede crear el primero para probar el foro."}</p>}
        <ForumPagination page={page} total={topics.total} path="/foro" query={filters} />
      </section>
    </div><aside className="forum-sidebar"><h2>Antes de publicar</h2><p>Solo participan administradores con permiso de foro. No se han importado cuentas, conversaciones ni publicaciones de otros sitios.</p><ol><li>Elija la sección adecuada.</li><li>Use información propia, lícita y consentida.</li><li>No incluya datos privados de anunciantes.</li><li>Pruebe cierre, fijación y papelera sin afectar anuncios.</li></ol><Link className="button button-primary" href="/foro/nuevo">Crear tema de prueba</Link><p>Los cambios quedan registrados en Actividad. Archivar y enviar a papelera permite recuperar contenido.</p><Link href="/terminos">Términos del sitio</Link> · <Link href="/privacidad">Privacidad</Link></aside></div>
  </div></AdminShell>;
}
