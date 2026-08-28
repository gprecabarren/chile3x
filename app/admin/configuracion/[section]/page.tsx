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
      {name === "operacion" && <section className="admin-settings-section"><div><p>FLUJO DEL PORTAL</p><h2>Control operativo</h2><span>Define cuándo se pueden crear y publicar nuevos anuncios.</span></div><div className="admin-settings-grid"><label>Apertura de anuncios nuevos<select name="listing_open" defaultValue={values.listing_open}><option value="closed">Cerrada</option><option value="waitlist">Lista de espera</option><option value="open">Abierta</option></select><small>Controla si las cuentas pueden iniciar borradores nuevos o si solo el equipo administrativo puede crearlos.</small></label><label>Publicación de anuncios<select name="moderation_mode" defaultValue={values.moderation_mode}><option value="manual">Aprobación manual</option><option value="manual_priority">Manual con prioridad</option></select><small>La aprobación manual evita que un anuncio aparezca públicamente antes de que el equipo lo revise.</small></label><label>Cobros y planes<select name="billing_mode" defaultValue={values.billing_mode}><option value="manual">Gestión manual</option><option value="planned">Evaluación futura</option></select><small>Define si los planes se administran fuera del sitio o quedan preparados para una integración posterior.</small></label><label>Modo mantenimiento<select name="maintenance_mode" defaultValue={values.maintenance_mode}><option value="disabled">Desactivado</option><option value="enabled">Activado</option></select><small>Al activarlo, el sitio público queda restringido y solo las cuentas administradoras pueden acceder.</small></label></div></section>}
      {name === "seo" && <section className="admin-settings-section"><div><p>VISIBILIDAD ORGÁNICA</p><h2>SEO base</h2><span>Estos textos se usan como base de buscadores y previsualizaciones al compartir el sitio.</span></div><div className="admin-settings-grid"><label>Título global<input name="site_title" maxLength={90} required defaultValue={values.site_title} /></label><label>URL pública del sitio<input name="site_url" type="url" maxLength={180} required defaultValue={values.site_url} /></label><label className="admin-field-full">Descripción global<textarea name="site_description" maxLength={180} rows={4} required defaultValue={values.site_description} /></label><label>Indexación en buscadores<select name="robots_indexing" defaultValue={values.robots_indexing}><option value="enabled">Activa: permitir indexación</option><option value="disabled">Desactivada: solicitar no indexar</option></select></label></div></section>}
      {name === "google" && <section className="admin-settings-section"><div><p>INTEGRACIONES</p><h2>Google</h2><span>Search Console se configura con su código. Analytics ya se administra mediante el contenedor oficial de Google Tag Manager para evitar medición duplicada.</span></div><div className="admin-settings-grid"><label>Verificación de Search Console<input name="google_site_verification" maxLength={180} defaultValue={values.google_site_verification} placeholder="Código entregado por Google" /></label><label>Identificador GA4 (gestionado por Tag Manager)<input name="google_analytics_id" maxLength={20} defaultValue={values.google_analytics_id} placeholder="G-JNPJ80SJX7" /><small>Déjalo vacío: el sitio usa GTM-NCJ3ZNH3 y no debe cargar gtag.js por separado.</small></label></div></section>}
      {name === "contacto" && <section className="admin-settings-section"><div><p>MEDIOS OFICIALES</p><h2>Contacto y redes</h2><span>Si un campo queda vacío, ese ícono no se muestra al público.</span></div><div className="admin-settings-grid"><label>WhatsApp del portal<input name="contact_whatsapp" inputMode="tel" maxLength={22} defaultValue={values.contact_whatsapp} placeholder="56912345678" /></label><label>Telegram<input name="contact_telegram" maxLength={180} defaultValue={values.contact_telegram} placeholder="@chile3x o https://t.me/chile3x" /></label><label>Instagram<input name="contact_instagram" maxLength={180} defaultValue={values.contact_instagram} placeholder="@chile3x o enlace de Instagram" /></label><label>Correo del portal<input name="contact_email" type="email" maxLength={180} defaultValue={values.contact_email} placeholder="contacto@chile3x.cl" /></label></div></section>}
      {name === "contenido" && <><FaqSettingsEditor initialEntries={readFaqEntries(values.faq_entries)} /><PublicationRulesEditor initialRules={readPublicationRules(values.publication_rules)} /></>}
      {name === "medios" && <section className="admin-settings-section"><div><p>PRIVACIDAD Y MARCA</p><h2>Imágenes de la galería</h2><span>Estos ajustes aplican solo a futuras fotos de la galería pública. No cambian foto principal, videos, historias ni contenido exclusivo.</span></div><div className="admin-settings-grid"><label>Marca de agua oficial<select name="profile_gallery_watermark_enabled" defaultValue={values.profile_gallery_watermark_enabled}><option value="enabled">Activada</option><option value="disabled">Desactivada</option></select><small>Activada agrega la marca Chile3X a cada foto nueva de la galería. Las fotos que ya tienen marca se mantienen sin cambios.</small></label><label>Difuminado facial opcional<select name="profile_gallery_face_blur_enabled" defaultValue={values.profile_gallery_face_blur_enabled}><option value="enabled">Disponible</option><option value="disabled">Desactivado</option></select><small>Disponible muestra un control por imagen. El rostro se detecta en el navegador y solo se difumina cuando quien sube la foto lo solicita.</small></label></div></section>}
      <button className="button button-primary" type="submit">Guardar cambios</button>
    </form>
  </div></AdminShell>;
}
