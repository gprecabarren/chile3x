import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";

const sections = [
  ["operacion", "Operación", "Apertura de perfiles, moderación, planes y modo mantenimiento."],
  ["seo", "SEO e identidad", "Título, descripción, URL pública e indexación de Google."],
  ["google", "Google y medición", "Search Console y Google Analytics."],
  ["contacto", "Contacto y redes", "WhatsApp, Telegram, Instagram y correo oficiales."],
  ["contenido", "FAQ y reglas", "Edita las preguntas frecuentes y las reglas de publicación."],
  ["medios", "Fotos de galería", "Marca de agua y desenfoque facial para futuras fotos públicas."],
] as const;

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/api/auth/github/start?return_to=/admin/configuracion");
  const params = await searchParams;

  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading eyebrow="CONFIGURACIÓN DEL PORTAL" title="Configuración" description="Cada área tiene su propia pantalla para que puedas ajustar el sitio sin mezclar ajustes operativos, SEO y contenido." backHref="/admin" />
    {params.saved === "1" && <p className="admin-success" role="status">Configuración guardada.</p>}
    <section className="admin-settings-hub" aria-label="Categorías de configuración">
      {sections.map(([slug, title, description], index) => <Link href={`/admin/configuracion/${slug}`} key={slug}><span>{String(index + 1).padStart(2, "0")}</span><div><p>{title}</p><small>{description}</small></div><b>→</b></Link>)}
    </section>
  </div></AdminShell>;
}
