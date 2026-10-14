import Link from "@/app/NavigationLink";
import { FORUM_PAGE_SIZE } from "@/lib/forum-policy";

export function ForumNavigation() {
  return <><p className="forum-beta-notice"><strong>BETA PRIVADA · SOLO ADMINISTRACIÓN</strong> Este foro no está abierto a usuarios ni visitantes. No publique documentos privados, datos médicos ni información personal de terceros. Los adjuntos requieren consentimiento y revisión; la apertura pública no está habilitada.</p>
    <nav className="forum-navigation" aria-label="Navegación del foro"><Link href="/foro">Secciones y actividad</Link><Link href="/foro/nuevo">Crear tema</Link><Link href="/foro/secciones">Administrar secciones</Link><Link href="/foro/normas">Normas</Link><Link href="/foro/moderacion">Moderación</Link><Link href="/foro/notificaciones">Mis notificaciones</Link><Link href="/foro?papelera=1">Papelera</Link><Link href="/admin/actividad?area=forum">Historial administrativo</Link></nav></>;
}
export function ForumRulesAcknowledgement({version}:{version:string}){return <><input type="hidden" name="rules_version" value={version} /><label className="forum-check"><input name="rules_ack" type="checkbox" value="yes" required />He leído y acepto las <Link href="/foro/normas">normas actuales del foro</Link>. Publico información propia, lícita y consentida, sin datos privados de terceros.</label></>;}

export function ForumDate({ value }: { value: string }) {
  const iso = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  return <time dateTime={iso}>{Number.isFinite(date.getTime()) ? date.toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "medium", timeStyle: "short" }) : "Fecha no disponible"}</time>;
}

export function ForumPagination({ page, total, path, query = {} }: { page: number; total: number; path: string; query?: Record<string, string> }) {
  const pages = Math.max(1, Math.ceil(total / FORUM_PAGE_SIZE));
  if (pages === 1) return null;
  const href = (number: number) => `${path}?${new URLSearchParams({ ...query, pagina: String(number) })}`;
  return <nav className="forum-pagination" aria-label="Paginación"><span>Página {page} de {pages}</span>{page > 1 && <Link href={href(page - 1)}>← Anterior</Link>}{page < pages && <Link href={href(page + 1)}>Siguiente →</Link>}</nav>;
}
