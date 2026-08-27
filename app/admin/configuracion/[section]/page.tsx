import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { readFaqEntries } from "@/lib/faq";
import { readPublicationRules } from "@/lib/publication-rules";
import { AdminPageHeading, AdminShell } from "../../_components";
import { FaqSettingsEditor } from "../FaqSettingsEditor";
import { PublicationRulesEditor } from "../PublicationRulesEditor";

const sectionDetails = {
  operacion: { eyebrow: "OPERACIÓN", title: "Publicaciones y mantenimiento", description: "Controles del flujo diario y la disponibilidad del directorio." },
  seo: { eyebrow: "SEO E IDENTIDAD", title: "Buscadores e identidad", description: "Información base que muestra Chile3X en resultados de búsqueda y al compartir enlaces." },
  google: { eyebrow: "GOOGLE", title: "Search Console y medición", description: "Conecta las herramientas de Google sin alterar el contenido público." },
  contacto: { eyebrow: "CONTACTO Y REDES", title: "Canales oficiales", description: "Estos medios aparecen solo cuando están configurados en header, footer y contacto." },
  contenido: { eyebrow: "CONTENIDO PÚBLICO", title: "FAQ y reglas", description: "Mantén actualizada la ayuda del portal y los criterios de moderación." },
  medios: { eyebrow: "MEDIOS DEL ANUNCIO", title: "Galería pública", description: "Controla cómo se preparan las futuras imágenes de las galerías públicas." },
} as const;

type SectionName = keyof typeof sectionDetails;
export const dynamic = "force-dynamic";

export default async function AdminSettingsSectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ section }, admin, values, query] = await Promise.all([params, getCurrentAdmin(), getSiteSettings(), searchParams]);
  if (!admin) redirect(`/api/auth/github/start?return_to=/admin/configuracion/${section}`);
  if (!(section in sectionDetails)) notFound();
  const name = section as SectionName;
  const details = sectionDetails[name];
  const returnTo = `/admin/configuracion/${name}`;

  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading {...details} backHref="/admin/configuracion" />
    {query.saved === "1" && <p className="admin-success" role="status">Configuración guardada.</p>}
    <form action="/api/admin/settings" method="post" className="admin-settings-form admin-settings-page-form"><input type="hidden" name="return_to" value={returnTo} />
      {name === "operacion" && <section className="admin-settings-section"><div><p>FLUJO DEL PORTAL</p><h2>Control operativo</h2><span>Define cuándo se pueden crear y publicar nuevos avisos.</span></div><div className="admin-settings-grid"><label>Apertura de perfiles nuevos<select name="listing_open" defaultValue={values.listing_open}><option value="closed">Cerrada: solo el equipo crea perfiles</option><option value="waitlist">Lista de espera: se reciben solicitudes</option><option value="open">Abierta: se pueden iniciar borradores</option></select></label><label>Publicación de avisos<select name="moderation_mode" defaultValue={values.moderation_mode}><option value="manual">Manual: todos requieren aprobación</option><option value="manual_priority">Manual con prioridad para avisos verificados</option></select></label><label>Cobros y planes<select name="billing_mode" defaultValue={values.billing_mode}><option value="manual">Manual: sin pagos integrados</option><option value="planned">Preparado para evaluación futura</option></select></label><label>Modo mantenimiento<select name="maintenance_mode" defaultValue={values.maintenance_mode}><option value="disabled">Desactivado: sitio público disponible</option><option value="enabled">Activado: solo administradores ven el sitio</option></select></label></div></section>}
      {name === "seo" && <section className="admin-settings-section"><div><p>VISIBILIDAD ORGÁNICA</p><h2>SEO base</h2><span>Estos textos se usan como base de buscadores y previsualizaciones al compartir el sitio.</span></div><div className="admin-settings-grid"><label>Título global<input name="site_title" maxLength={90} required defaultValue={values.site_title} /></label><label>URL pública del sitio<input name="site_url" type="url" maxLength={180} required defaultValue={values.site_url} /></label><label className="admin-field-full">Descripción global<textarea name="site_description" maxLength={180} rows={4} required defaultValue={values.site_description} /></label><label>Indexación en buscadores<select name="robots_indexing" defaultValue={values.robots_indexing}><option value="enabled">Activa: permitir indexación</option><option value="disabled">Desactivada: solicitar no indexar</option></select></label></div></section>}
      {name === "google" && <section className="admin-settings-section"><div><p>INTEGRACIONES</p><h2>Google</h2><span>Search Console se configura con su código. Analytics ya se administra mediante el contenedor oficial de Google Tag Manager para evitar medición duplicada.</span></div><div className="admin-settings-grid"><label>Verificación de Search Console<input name="google_site_verification" maxLength={180} defaultValue={values.google_site_verification} placeholder="Código entregado por Google" /></label><label>Identificador GA4 (gestionado por Tag Manager)<input name="google_analytics_id" maxLength={20} defaultValue={values.google_analytics_id} placeholder="G-JNPJ80SJX7" /><small>Déjalo vacío: el sitio usa GTM-NCJ3ZNH3 y no debe cargar gtag.js por separado.</small></label></div></section>}
      {name === "contacto" && <section className="admin-settings-section"><div><p>MEDIOS OFICIALES</p><h2>Contacto y redes</h2><span>Si un campo queda vacío, ese ícono no se muestra al público.</span></div><div className="admin-settings-grid"><label>WhatsApp del portal<input name="contact_whatsapp" inputMode="tel" maxLength={22} defaultValue={values.contact_whatsapp} placeholder="56912345678" /></label><label>Telegram<input name="contact_telegram" maxLength={180} defaultValue={values.contact_telegram} placeholder="@chile3x o https://t.me/chile3x" /></label><label>Instagram<input name="contact_instagram" maxLength={180} defaultValue={values.contact_instagram} placeholder="@chile3x o enlace de Instagram" /></label><label>Correo del portal<input name="contact_email" type="email" maxLength={180} defaultValue={values.contact_email} placeholder="contacto@chile3x.cl" /></label></div></section>}
      {name === "contenido" && <><FaqSettingsEditor initialEntries={readFaqEntries(values.faq_entries)} /><PublicationRulesEditor initialRules={readPublicationRules(values.publication_rules)} /></>}
      {name === "medios" && <section className="admin-settings-section"><div><p>PRIVACIDAD Y MARCA</p><h2>Imágenes de la galería</h2><span>Estos ajustes aplican solo a futuras fotos de la galería pública. No cambian foto principal, videos, historias ni contenido exclusivo.</span></div><div className="admin-settings-grid"><label>Marca de agua oficial<select name="profile_gallery_watermark_enabled" defaultValue={values.profile_gallery_watermark_enabled}><option value="enabled">Activada: aplicar Chile3X a fotos nuevas</option><option value="disabled">Desactivada: no aplicar a fotos nuevas</option></select><small>Las fotos que ya tienen marca de agua se mantienen sin cambios.</small></label><label>Difuminado facial opcional<select name="profile_gallery_face_blur_enabled" defaultValue={values.profile_gallery_face_blur_enabled}><option value="enabled">Disponible para quien sube cada foto</option><option value="disabled">No mostrar opción de difuminar</option></select><small>La detección se realiza en el navegador de quien sube la foto y solo si marca la opción.</small></label></div></section>}
      <button className="button button-primary" type="submit">Guardar cambios</button>
    </form>
  </div></AdminShell>;
}
