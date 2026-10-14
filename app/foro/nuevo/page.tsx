import { AdminPageHeading, AdminShell } from "@/app/admin/_components";
import { getForumSections, requireForumAdmin } from "@/lib/forum";
import { FORUM_LIMITS } from "@/lib/forum-policy";
import { ForumForm } from "../ForumForm";
import { ForumNavigation } from "../_components";

export default async function NewForumTopicPage({ searchParams }: { searchParams: Promise<{ seccion?: string }> }) {
  const admin = await requireForumAdmin(); const [sections, query] = await Promise.all([getForumSections(), searchParams]);
  return <AdminShell user={admin}><div className="admin-content forum-root"><AdminPageHeading eyebrow="FORO BETA PRIVADO" title="Crear tema" description="Este tema solo será visible para administración durante la beta." backHref="/foro" /><ForumNavigation />
    <section className="forum-card"><ForumForm label="Publicar tema privado"><input type="hidden" name="action" value="topic_create" /><label>Sección<select name="seccion" required defaultValue={query.seccion || ""}><option value="">Seleccione una sección</option>{sections.filter(s => !s.isArchived).map(s => <option value={s.id} key={s.id}>{s.groupName} · {s.title}</option>)}</select></label><label>Título<input name="titulo" required maxLength={FORUM_LIMITS.title} placeholder="Un título concreto para la conversación" /></label><label>Mensaje<textarea name="texto" rows={10} required maxLength={FORUM_LIMITS.body} placeholder="Escriba el contenido del tema" /><small>Hasta {FORUM_LIMITS.body} caracteres. Texto sin HTML ni archivos adjuntos. No incluya información privada.</small></label></ForumForm></section>
  </div></AdminShell>;
}
