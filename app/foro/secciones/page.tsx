import { AdminPageHeading, AdminShell } from "@/app/admin/_components";
import { getForumSections, requireForumAdmin } from "@/lib/forum";
import { FORUM_LIMITS } from "@/lib/forum-policy";
import { ForumForm } from "../ForumForm";
import { ForumNavigation } from "../_components";

type Section = Awaited<ReturnType<typeof getForumSections>>[number];
function Fields({ section }: { section?: Section }) {
  return <><div className="forum-two-columns"><label>Grupo<input name="grupo" required maxLength={FORUM_LIMITS.group} defaultValue={section?.groupName ?? "Comunidad Chile3X"} list="forum-groups" /></label><label>Nombre de sección<input name="nombre" required maxLength={FORUM_LIMITS.sectionTitle} defaultValue={section?.title} /></label></div><label>Descripción<textarea name="descripcion" maxLength={FORUM_LIMITS.description} rows={2} defaultValue={section?.description} /></label><label>Reglas particulares<textarea name="reglas" maxLength={FORUM_LIMITS.rules} rows={3} defaultValue={section?.rules} /><small>Complementan las normas del sitio; no pueden autorizar contenido ilícito ni datos privados.</small></label><div className="forum-two-columns"><label>Orden dentro del grupo<input name="orden" type="number" min={0} max={9999} required defaultValue={section?.sortOrder ?? 10} /></label><label className="forum-check"><input type="checkbox" name="archivada" defaultChecked={section?.isArchived} />Archivar sección</label></div></>;
}

export default async function ForumSectionsPage() {
  const admin = await requireForumAdmin(); const sections = await getForumSections();
  return <AdminShell user={admin}><div className="admin-content forum-root"><AdminPageHeading eyebrow="FORO BETA PRIVADO" title="Administrar secciones" description="Edite nombres, grupos, descripciones, reglas y orden. Archivar conserva los temas y permite reactivar la sección." backHref="/foro" /><ForumNavigation />
    <datalist id="forum-groups">{[...new Set(sections.map(s => s.groupName))].map(group => <option value={group} key={group} />)}</datalist>
    <details className="forum-card"><summary>+ Crear una sección</summary><ForumForm label="Crear sección"><input type="hidden" name="action" value="section_create" /><Fields /></ForumForm></details>
    <div className="forum-section-edit-list">{sections.map(s => <details className="forum-card" key={s.id}><summary><span>{s.title} <small>{s.groupName} · {s.topics} temas{s.isArchived ? " · Archivada" : ""}</small></span></summary><ForumForm><input type="hidden" name="action" value="section_update" /><input type="hidden" name="id" value={s.id} /><input type="hidden" name="version" value={s.updatedAt} /><Fields section={s} /></ForumForm></details>)}</div>
  </div></AdminShell>;
}
