import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { getSiteSettings } from "@/lib/site-settings";
import { readFaqEntries } from "@/lib/faq";
import { readPublicationRules } from "@/lib/publication-rules";
import { AdminPageHeading, AdminShell } from "../../_components";
import { FaqSettingsEditor } from "../FaqSettingsEditor";
import { PublicationRulesEditor } from "../PublicationRulesEditor";
import { WhatsappSettingsEditor } from "../WhatsappSettingsEditor";
import { readWhatsappContacts, WHATSAPP_TEXT_LIMITS } from "@/lib/portal-whatsapp";
import { PortalWhatsappStats } from "@/app/admin/PortalWhatsappStats";
import { getXAdminConfiguration, X_CALLBACK_URL } from "@/lib/x-settings";

const sectionDetails = {
  operacion: { eyebrow: "OPERACIÓN", title: "Publicaciones y mantenimiento", description: "Controles del flujo diario y la disponibilidad del directorio." },
  seo: { eyebrow: "SEO E IDENTIDAD", title: "Buscadores e identidad", description: "Información base que muestra Chile3X en resultados de búsqueda y al compartir enlaces." },
  google: { eyebrow: "GOOGLE", title: "Search Console y medición", description: "Conecta las herramientas de Google sin alterar el contenido público." },
  apple: { eyebrow: "APPLE", title: "Inicio de sesión con Apple", description: "Prepara las credenciales de Apple Developer y habilita el proveedor solo cuando la configuración esté completa." },
  x: { eyebrow: "X · TWITTER", title: "Inicio de sesión con X", description: "Administra las credenciales y el estado del proveedor. Guardar datos no compra créditos ni activa recargas." },
  contacto: { eyebrow: "CONTACTO Y REDES", title: "Canales oficiales", description: "Administra el soporte principal, las opciones del WhatsApp flotante y las redes del sitio. Los WhatsApp de los anunciantes no cambian." },
  contenido: { eyebrow: "CONTENIDO PÚBLICO", title: "FAQ y reglas", description: "Mantén actualizada la ayuda del portal y los criterios de moderación." },
  medios: { eyebrow: "MEDIOS DEL ANUNCIO", title: "Galería pública", description: "Controla cómo se preparan las futuras imágenes de las galerías públicas." },
} as const;

type SectionName = keyof typeof sectionDetails;
export const dynamic = "force-dynamic";

export default async function AdminSettingsSectionPage({ params, searchParams }: { params: Promise<{ section: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ section }, admin, values, query] = await Promise.all([params, getCurrentAdmin(), getSiteSettings(), searchParams]);
  if (!admin) redirect(`/api/auth/github/start?return_to=/admin/configuracion/${section}`);
  if (!adminHasCapability(admin, "settings.manage")) redirect("/admin/acceso-denegado?reason=permission");
  if (!(section in sectionDetails)) notFound();
  const name = section as SectionName;
  const details = sectionDetails[name];
  const returnTo = `/admin/configuracion/${name}`;
  const xConfiguration = name === "x" ? await getXAdminConfiguration() : null;
  let appleSecrets = { privateKey: false, encryptionKey: false };
  if (name === "apple") {
    try {
      const { env } = await import("cloudflare:workers");
      appleSecrets = { privateKey: Boolean(env.APPLE_PRIVATE_KEY), encryptionKey: Boolean(env.APPLE_TOKEN_ENCRYPTION_KEY) };
    } catch {
      // The local static renderer has no access to production secrets.
    }
  }

  return <AdminShell user={admin}><div className="admin-content">
    <AdminPageHeading {...details} backHref="/admin/configuracion" />
    {query.saved === "1" && <p className="admin-success" role="status">Configuración guardada.</p>}
    {name === "contacto" && query.saved === "1" && <p className="admin-note">Los enlaces se actualizan al cargar una página nueva. La caché pública puede tardar hasta 10 minutos en mostrar cambios; los WhatsApp de los anunciantes no se modifican.</p>}
    <form action={name === "x" ? "/api/admin/x-settings" : "/api/admin/settings"} method="post" className="admin-settings-form admin-settings-page-form"><input type="hidden" name="return_to" value={returnTo} />
      {name === "operacion" && <section className="admin-settings-section"><div><p>FLUJO DEL PORTAL</p><h2>Control operativo</h2><span>Define cuándo se pueden crear y publicar nuevos anuncios.</span></div><div className="admin-settings-grid"><label>Apertura de anuncios nuevos<select name="listing_open" defaultValue={values.listing_open}><option value="closed">Cerrada</option><option value="waitlist">Lista de espera</option><option value="open">Abierta</option></select><small>Controla si las cuentas pueden iniciar borradores nuevos o si solo el equipo administrativo puede crearlos.</small></label><label>Publicación de anuncios<select name="moderation_mode" defaultValue={values.moderation_mode}><option value="manual">Aprobación manual</option><option value="manual_priority">Manual con prioridad</option></select><small>La aprobación manual evita que un anuncio aparezca públicamente antes de que el equipo lo revise.</small></label><label>Cobros y planes<select name="billing_mode" defaultValue={values.billing_mode}><option value="manual">Gestión manual</option><option value="planned">Evaluación futura</option></select><small>Define si los planes se administran fuera del sitio o quedan preparados para una integración posterior.</small></label><label>Modo mantenimiento<select name="maintenance_mode" defaultValue={values.maintenance_mode}><option value="disabled">Desactivado</option><option value="enabled">Activado</option></select><small>Al activarlo, el sitio público queda restringido y solo las cuentas administradoras pueden acceder.</small></label></div></section>}
      {name === "seo" && <section className="admin-settings-section"><div><p>VISIBILIDAD ORGÁNICA</p><h2>SEO base</h2><span>Estos textos se usan como base de buscadores y previsualizaciones al compartir el sitio.</span></div><div className="admin-settings-grid"><label>Título global<input name="site_title" maxLength={90} required defaultValue={values.site_title} /></label><label>URL pública del sitio<input name="site_url" type="url" maxLength={180} required defaultValue={values.site_url} /></label><label className="admin-field-full">Descripción global<textarea name="site_description" maxLength={180} rows={4} required defaultValue={values.site_description} /></label><label>Indexación en buscadores<select name="robots_indexing" defaultValue={values.robots_indexing}><option value="enabled">Activa: permitir indexación</option><option value="disabled">Desactivada: solicitar no indexar</option></select></label></div></section>}
      {name === "google" && <section className="admin-settings-section"><div><p>INTEGRACIONES</p><h2>Google</h2><span>Search Console se configura con su código. Analytics ya se administra mediante el contenedor oficial de Google Tag Manager para evitar medición duplicada.</span></div><div className="admin-settings-grid"><label>Verificación de Search Console<input name="google_site_verification" maxLength={180} defaultValue={values.google_site_verification} placeholder="Código entregado por Google" /></label><label>Identificador GA4 (gestionado por Tag Manager)<input name="google_analytics_id" maxLength={20} defaultValue={values.google_analytics_id} placeholder="G-JNPJ80SJX7" /><small>Déjalo vacío: el sitio usa GTM-NCJ3ZNH3 y no debe cargar gtag.js por separado.</small></label><label className="form-grid-full">ID de cliente web de Google<input name="google_oauth_client_id" maxLength={180} defaultValue={values.google_oauth_client_id} placeholder="000000000000-abc.apps.googleusercontent.com" /><small>Habilita el botón oficial “Continuar con Google” en registro e ingreso. El ID es público; Chile3X no almacena tokens de acceso de Google.</small></label></div></section>}
      {name === "apple" && <section className="admin-settings-section apple-settings-section"><div><p>AUTENTICACIÓN PREPARADA</p><h2>Apple Developer</h2><span>El botón ya aparece deshabilitado en registro e ingreso. Solo podrá activarse cuando existan todos los identificadores y ambos secretos; guardar datos parciales no publica el acceso.</span></div><div className="admin-settings-grid">
        <label>Estado<select name="apple_sign_in_status" defaultValue={values.apple_sign_in_status}><option value="disabled">Deshabilitado</option><option value="enabled">Activado</option></select><small>El servidor impedirá activar una configuración incompleta.</small></label>
        <label>Services ID<input name="apple_services_id" maxLength={180} defaultValue={values.apple_services_id} placeholder="cl.chile3x.web" /><small>Es el identificador de cliente web que Apple valida en los tokens.</small></label>
        <label>Team ID<input name="apple_team_id" maxLength={10} defaultValue={values.apple_team_id} placeholder="AB12CD34EF" /></label>
        <label>Key ID<input name="apple_key_id" maxLength={10} defaultValue={values.apple_key_id} placeholder="AB12CD34EF" /></label>
        <label className="admin-field-full">App ID principal<input name="apple_primary_app_id" maxLength={180} defaultValue={values.apple_primary_app_id} placeholder="cl.chile3x.app" /><small>Apple exige asociar el Services ID del sitio a un App ID principal con “Sign in with Apple”. Este valor queda como referencia operativa y no se expone al navegador.</small></label>
        <label className="admin-field-full">URL de retorno<span className="telegram-readonly-field">https://chile3x.cl/api/auth/apple/callback</span><small>Debe registrarse exactamente así en Apple Developer, con HTTPS, dominio y ruta completos.</small></label>
      </div><div className="apple-secret-status" aria-label="Estado de secretos de Apple"><span className={appleSecrets.privateKey ? "is-ready" : "is-pending"}>APPLE_PRIVATE_KEY: {appleSecrets.privateKey ? "configurada" : "pendiente"}</span><span className={appleSecrets.encryptionKey ? "is-ready" : "is-pending"}>APPLE_TOKEN_ENCRYPTION_KEY: {appleSecrets.encryptionKey ? "configurada" : "pendiente"}</span></div><p className="telegram-implementation-note">La clave privada <code>.p8</code> y la clave aleatoria de cifrado nunca se pegan en este formulario ni se guardan en D1: se cargan como secretos de Cloudflare. Antes de activar, registra en Apple el dominio <code>chile3x.cl</code>, la URL de retorno indicada y los remitentes del correo transaccional si se usará el correo privado de retransmisión de Apple. Apple Developer Program es un servicio externo pagado; esta preparación no crea una suscripción ni genera cobros.</p><p><a className="text-link" href="https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web" target="_blank" rel="noreferrer">Abrir requisitos oficiales de Apple <span aria-hidden="true">→</span></a></p></section>}
      {name === "x" && xConfiguration && <section className="admin-settings-section apple-settings-section"><div><p>AUTENTICACIÓN PREPARADA</p><h2>X Developer</h2><span>El botón aparece entre Google y Apple. Permanece deshabilitado hasta que elijas activarlo expresamente y confirmes los requisitos. Guardar credenciales parciales no lo activa.</span></div><div className="admin-settings-grid">
        <label>Estado<select name="x_sign_in_status" defaultValue={values.x_sign_in_status}><option value="disabled">Deshabilitado</option><option value="enabled">Activado</option></select><small>Usa Deshabilitado mientras evalúas la tarjeta o los créditos de X.</small></label>
        <label>OAuth 2.0 Client ID<input name="x_oauth_client_id" maxLength={180} defaultValue={xConfiguration.clientId || values.x_oauth_client_id} autoComplete="off" spellCheck={false} /><small>Debe corresponder a la misma aplicación que el Client Secret.</small></label>
        <label className="admin-field-full">Reemplazar Client Secret<input name="x_oauth_client_secret" type="password" maxLength={512} autoComplete="new-password" spellCheck={false} placeholder="Dejar vacío para conservar el secreto actual" /><small>El valor guardado nunca se muestra. Un reemplazo se cifra antes de guardarse y no aparece en el historial. Si cambias de aplicación, reemplaza ambos datos.</small></label>
        <label className="admin-field-full">URL de retorno<span className="telegram-readonly-field">{X_CALLBACK_URL}</span><small>Registra esta URL exacta en el portal de X. Es fija para proteger el retorno de OAuth.</small></label>
        <label className="admin-field-full x-activation-confirmation"><input name="x_activation_confirmed" type="checkbox" /><span>Solo para activar: confirmé las credenciales, los permisos de solo lectura y los requisitos o créditos de X.</span></label>
      </div><div className="apple-secret-status" aria-label="Estado de la configuración de X"><span className={xConfiguration.secretConfigured ? "is-ready" : "is-pending"}>Client Secret: {xConfiguration.secretConfigured ? "configurado (oculto)" : "pendiente"}</span><span className={xConfiguration.encryptionReady ? "is-ready" : "is-pending"}>Cifrado del servidor: {xConfiguration.encryptionReady ? "listo" : "pendiente"}</span></div>
      {xConfiguration.configurationError && <p className="form-alert" role="alert">No fue posible leer las credenciales privadas. El acceso con X queda cerrado hasta resolverlo.</p>}
      <p className="telegram-implementation-note">En X usa OAuth 2.0, aplicación web confidencial y acceso de solo lectura a identidad y correo autorizado. No solicites publicación ni mensajes privados. Chile3X no añade tarjetas, compra créditos ni configura recarga automática desde este panel. Al cambiar la configuración se invalidan los intentos de acceso con X pendientes; no se eliminan cuentas ni anuncios.</p>
      <p><a className="text-link" href="https://console.x.com" target="_blank" rel="noopener noreferrer">Abrir portal de X <span aria-hidden="true">→</span></a></p></section>}
      {name === "contacto" && <>
        <section className="admin-settings-section"><div><p>CONTACTO PRINCIPAL</p><h2>Soporte técnico y redes</h2><span>Soporte aparece primero en el panel compartido del botón flotante, header y footer. Contacto, Quiénes somos y registro siguen enlazando directamente a soporte. Deja el número vacío para ocultar ese contacto.</span></div><div className="admin-settings-grid">
          <label>WhatsApp principal de soporte<input name="contact_whatsapp" inputMode="tel" maxLength={22} defaultValue={values.contact_whatsapp} placeholder="+56 9 1234 5678" /></label>
          <label>Nombre del área principal<input name="contact_whatsapp_label" maxLength={WHATSAPP_TEXT_LIMITS.label} required defaultValue={values.contact_whatsapp_label.slice(0, WHATSAPP_TEXT_LIMITS.label)} /><small>Máximo {WHATSAPP_TEXT_LIMITS.label} caracteres.</small></label>
          <label className="admin-field-full">Explicación de soporte<textarea name="contact_whatsapp_description" maxLength={WHATSAPP_TEXT_LIMITS.description} rows={2} required defaultValue={values.contact_whatsapp_description.slice(0, WHATSAPP_TEXT_LIMITS.description)} /><small>Máximo {WHATSAPP_TEXT_LIMITS.description} caracteres.</small></label>
          <label className="admin-field-full">Mensaje inicial de soporte<textarea name="contact_whatsapp_message" maxLength={WHATSAPP_TEXT_LIMITS.message} rows={2} required defaultValue={values.contact_whatsapp_message} /><small>Máximo {WHATSAPP_TEXT_LIMITS.message} caracteres. El registro conserva su mensaje específico de solicitud de creación de cuenta.</small></label>
          <label>Comunidad pública de Telegram<input name="contact_telegram" maxLength={180} defaultValue={values.contact_telegram} placeholder="@Chile3XComunidad o enlace t.me" /><small>Este mismo enlace alimenta el header y footer y se administra también en Telegram.</small></label>
          <label>Instagram<input name="contact_instagram" maxLength={180} defaultValue={values.contact_instagram} placeholder="@chile3x o enlace de Instagram" /></label>
          <label>Correo del portal<input name="contact_email" type="email" maxLength={180} defaultValue={values.contact_email} placeholder="contacto@chile3x.cl" /></label>
        </div></section>
        <section className="admin-settings-section"><div><p>PANEL COMPARTIDO</p><h2>Presentación y aclaración</h2><span>Los tres accesos abren el mismo panel centrado. Solo elegir un contacto abre WhatsApp. Con más números, la lista se desplaza sin ocultar el título, el cierre ni el enlace al directorio.</span></div><div className="admin-settings-grid">
          <label>Botón flotante<select name="whatsapp_panel_enabled" defaultValue={values.whatsapp_panel_enabled}><option value="enabled">Mostrar</option><option value="disabled">Ocultar</option></select><small>No desactiva el panel del header y footer ni los enlaces directos de soporte.</small></label>
          <label>Texto accesible del botón<input name="whatsapp_button_label" maxLength={WHATSAPP_TEXT_LIMITS.button} required defaultValue={values.whatsapp_button_label} /><small>Máximo {WHATSAPP_TEXT_LIMITS.button} caracteres.</small></label>
          <label className="admin-field-full">Título del panel<input name="whatsapp_panel_title" maxLength={WHATSAPP_TEXT_LIMITS.title} required defaultValue={values.whatsapp_panel_title.slice(0, WHATSAPP_TEXT_LIMITS.title)} /><small>Máximo {WHATSAPP_TEXT_LIMITS.title} caracteres.</small></label>
          <label className="admin-field-full">Aclaración para visitantes<textarea name="whatsapp_panel_description" maxLength={WHATSAPP_TEXT_LIMITS.explanation} rows={3} required defaultValue={values.whatsapp_panel_description.slice(0, WHATSAPP_TEXT_LIMITS.explanation)} /><small>Máximo {WHATSAPP_TEXT_LIMITS.explanation} caracteres. Mantén claro que estos números son del equipo del sitio y no de los anunciantes.</small></label>
        </div></section>
        <WhatsappSettingsEditor initialContacts={readWhatsappContacts(values.whatsapp_extra_contacts)} />
      </>}
      {name === "contenido" && <><FaqSettingsEditor initialEntries={readFaqEntries(values.faq_entries)} /><PublicationRulesEditor initialRules={readPublicationRules(values.publication_rules)} /></>}
      {name === "medios" && <section className="admin-settings-section"><div><p>PRIVACIDAD Y MARCA</p><h2>Opciones de fotos nuevas</h2><span>Configura las opciones de fotos principales y de galería. No modifica archivos ya guardados, videos, historias ni contenido exclusivo.</span></div><div className="admin-settings-grid"><label>Marca de agua de galería por defecto<select name="profile_gallery_watermark_enabled" defaultValue={values.profile_gallery_watermark_enabled}><option value="enabled">Activada</option><option value="disabled">Desactivada</option></select><small>Define la selección inicial para las fotos nuevas de galería. Quien sube cada foto puede cambiarla; la foto principal tiene su propia opción.</small></label><label>Difuminado manual y automático opcional<select name="profile_gallery_face_blur_enabled" defaultValue={values.profile_gallery_face_blur_enabled}><option value="enabled">Disponible</option><option value="disabled">Desactivado</option></select><small>Disponible muestra el control en foto principal y galería. Permite detectar rostros o marcar hasta 10 zonas con clic, toque o arrastre; solo se procesa si quien sube la foto lo solicita.</small></label></div></section>}
      <button className="button button-primary" type="submit">Guardar cambios</button>
    </form>
    {name === "contacto" && <PortalWhatsappStats />}
  </div></AdminShell>;
}
