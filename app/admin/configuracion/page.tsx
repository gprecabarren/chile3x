import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { readFaqEntries } from "@/lib/faq";
import { readPublicationRules } from "@/lib/publication-rules";
import { AdminPageHeading, AdminShell } from "../_components";
import { FaqSettingsEditor } from "./FaqSettingsEditor";
import { PublicationRulesEditor } from "./PublicationRulesEditor";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/api/auth/github/start?return_to=/admin/configuracion");
  }

  const [values, params] = await Promise.all([getSiteSettings(), searchParams]);
  const faqEntries = readFaqEntries(values.faq_entries);
  const publicationRules = readPublicationRules(values.publication_rules);

  return (
    <AdminShell user={admin}>
      <div className="admin-content"><a className="page-back-link" href="/admin">← Volver al resumen</a>
        <AdminPageHeading
          eyebrow="CONFIGURACIÓN DEL PORTAL"
          title="Configuración del portal"
          description="Organiza la operación, visibilidad pública, SEO, contactos oficiales y el modo mantenimiento desde un único lugar."
        />
        {params.saved === "1" && <p className="admin-success" role="status">Configuración guardada.</p>}
        <form action="/api/admin/settings" method="post" className="admin-settings-form">
          <section className="admin-settings-section">
            <div><p>OPERACIÓN</p><h2>Publicaciones y mantenimiento</h2><span>Estos controles afectan el flujo diario del directorio.</span></div>
            <div className="admin-settings-grid">
              <label>Apertura de perfiles nuevos<select name="listing_open" defaultValue={values.listing_open}><option value="closed">Cerrada: solo el equipo crea perfiles</option><option value="waitlist">Lista de espera: se reciben solicitudes</option><option value="open">Abierta: se pueden iniciar borradores</option></select></label>
              <label>Publicación de avisos<select name="moderation_mode" defaultValue={values.moderation_mode}><option value="manual">Manual: todos requieren aprobación</option><option value="manual_priority">Manual con prioridad para avisos verificados</option></select></label>
              <label>Cobros y planes<select name="billing_mode" defaultValue={values.billing_mode}><option value="manual">Manual: sin pagos integrados</option><option value="planned">Preparado para evaluación futura</option></select></label>
              <label>Modo mantenimiento<select name="maintenance_mode" defaultValue={values.maintenance_mode}><option value="disabled">Desactivado: sitio público disponible</option><option value="enabled">Activado: solo administradores ven el sitio</option></select></label>
            </div>
          </section>
          <section className="admin-settings-section">
            <div><p>SEO E IDENTIDAD</p><h2>Cómo aparece Chile3X en buscadores</h2><span>Usa la URL definitiva cuando conectes tu dominio. La indexación está habilitada por defecto.</span></div>
            <div className="admin-settings-grid">
              <label>Título global<input name="site_title" maxLength={90} required defaultValue={values.site_title} /></label>
              <label>URL pública del sitio<input name="site_url" type="url" maxLength={180} required defaultValue={values.site_url} /></label>
              <label className="admin-field-full">Descripción global<textarea name="site_description" maxLength={180} rows={3} required defaultValue={values.site_description} /></label>
              <label>Indexación en buscadores<select name="robots_indexing" defaultValue={values.robots_indexing}><option value="enabled">Activa: permitir indexación</option><option value="disabled">Desactivada: solicitar no indexar</option></select></label>
            </div>
          </section>
          <section className="admin-settings-section">
            <div><p>GOOGLE</p><h2>Search Console y medición</h2><span>Opcional. Pega solo el código de verificación de Google Search Console y/o tu identificador de Analytics.</span></div>
            <div className="admin-settings-grid">
              <label>Verificación de Search Console<input name="google_site_verification" maxLength={180} defaultValue={values.google_site_verification} placeholder="Código entregado por Google" /></label>
              <label>Identificador de Google Analytics<input name="google_analytics_id" maxLength={20} defaultValue={values.google_analytics_id} placeholder="G-XXXXXXXXXX" /></label>
            </div>
          </section>
          <section className="admin-settings-section">
            <div><p>CONTACTO Y REDES</p><h2>Canales oficiales de Chile3X</h2><span>Solo se mostrarán en el header, footer y botón flotante los canales que completes aquí. Estos contactos son del portal, no de cada aviso.</span></div>
            <div className="admin-settings-grid">
              <label>WhatsApp del portal<input name="contact_whatsapp" inputMode="tel" maxLength={22} defaultValue={values.contact_whatsapp} placeholder="56912345678" /></label>
              <label>Telegram<input name="contact_telegram" maxLength={180} defaultValue={values.contact_telegram} placeholder="@chile3x o https://t.me/chile3x" /></label>
              <label>Instagram<input name="contact_instagram" maxLength={180} defaultValue={values.contact_instagram} placeholder="@chile3x o enlace de Instagram" /></label>
              <label>Correo del portal<input name="contact_email" type="email" maxLength={180} defaultValue={values.contact_email} placeholder="contacto@chile3x.cl" /></label>
            </div>
          </section>
          <FaqSettingsEditor initialEntries={faqEntries} />
          <PublicationRulesEditor initialRules={publicationRules} />
          <button className="button button-primary" type="submit">Guardar configuración</button>
        </form>
      </div>
    </AdminShell>
  );
}
