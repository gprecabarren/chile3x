import { redirect } from 'next/navigation';
import Image from 'next/image';
import { getCurrentAdmin } from '@/lib/auth';
import { adminHasCapability } from '@/lib/admin-permissions';
import { privatePageMetadata, socialCardImageUrl } from '@/lib/seo';
import { getSiteSettings } from '@/lib/site-settings';
import { getInformationSeo, informationSeoSnapshot } from '@/lib/information-seo';
import { informationPageId, INFORMATION_PAGES } from '@/lib/information-seo-policy';
import { currentRevision } from '@/lib/collaboration';
import { parseHomeTexts } from '@/lib/home-content-policy';
import { readHomeLayout } from '@/lib/home-layout-policy';
import { AdminShell, AdminPageHeading } from '@/app/admin/_components';
import { ReviewScope } from '@/app/admin/ReviewScope';
import { ActionAnchor } from '@/app/ActionButton';
import { InformationSeoEditor } from './InformationSeoEditor';
import { SeoSettingsGuide, SeoFeatureHelp } from '../SeoSettingsHelp';
import './information-seo.css';

export const dynamic = 'force-dynamic';
export const metadata = privatePageMetadata({ title: 'Metadatos de páginas informativas', description: 'Edición privada y revisión de configuración efectiva.', path: '/admin/contenido/seo/paginas' });
export default async function Page({ searchParams }: { searchParams: Promise<{ pagina?: string; saved?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/api/auth/github/start?return_to=/admin/contenido/seo/paginas');
  if (!adminHasCapability(admin, 'settings.manage')) redirect('/admin/acceso-denegado?reason=permission');
  const [query, revision] = await Promise.all([searchParams, currentRevision('settings:site')]);
  const readOnly = query.pagina === 'inicio';
  const id = informationPageId(query.pagina) ?? 'contacto';
  const data = readOnly ? null : await getInformationSeo(id);
  const settings = readOnly ? await getSiteSettings() : null;
  const layout = settings ? readHomeLayout(settings.home_layout) : 'classic';
  const home = settings ? parseHomeTexts(settings[`home_content_${layout}`], layout) : null;
  return <AdminShell user={admin}><div className="admin-content info-seo-page">
    <AdminPageHeading eyebrow="SEO Y BUSCADORES · POR PÁGINA" title={readOnly ? 'Inicio · consulta de metadatos' : `SEO de ${INFORMATION_PAGES[id].label}`} description="Editas títulos y descripciones para buscadores, tarjetas sociales e indexación. No cambia el texto visible dentro de la página. Abrir este editor no publica cambios." backHref="/admin/contenido" />
    <p className="content-editing-notice content-tone-search"><strong>Estás editando configuración SEO.</strong> Los valores actuales ya están cargados. Primero revisas las diferencias y luego las aplicas a la página seleccionada. La puntuación comprueba campos técnicos, no posiciones en Google.</p>
    <nav className="info-seo-navigation" aria-label="Página a revisar">
      {Object.entries(INFORMATION_PAGES).map(([key, page]) => <ActionAnchor className="button button-outline" key={key} href={`?pagina=${key}`} aria-current={!readOnly && key === id ? 'page' : undefined}>{!readOnly && key === id ? <span aria-hidden="true">✓</span> : null}{page.label}</ActionAnchor>)}
      <ActionAnchor className="button button-outline" href="?pagina=inicio" aria-current={query.pagina === 'inicio' ? 'page' : undefined}>Inicio · consulta</ActionAnchor>
    </nav>
    <SeoFeatureHelp/>
    {readOnly && settings ? <><SeoSettingsGuide settings={settings} context="home"/><section className="info-seo-card"><h2>{`Inicio · diseño activo ${layout === 'classic' ? 'clásico' : 'compacto'}`}</h2><p>Consulta de la configuración actual, sin campos de edición en esta herramienta. Para cambiar estos valores, abre «Editar el SEO del Home» en la explicación anterior.</p><dl className="info-seo-values">
      <dt>Título</dt><dd>{home?.seoTitle}</dd>
      <dt>Descripción</dt><dd>{home?.seoDescription}</dd>
      <dt>Canónica</dt><dd>/</dd>
      <dt>Indexación global</dt><dd>{settings.robots_indexing === 'enabled' ? 'Permitida' : 'Desactivada'}</dd>
      <dt>Imagen social vigente</dt><dd><Image className="info-seo-current-image" src={socialCardImageUrl} alt="Imagen social actual" width={320} height={180} unoptimized/><code>{socialCardImageUrl}</code></dd>
    </dl><p>Los valores de la portada dependen del diseño activo. Esta consulta no activa el otro Home ni crea una URL pública nueva.</p>{(['classic','compact'] as const).map(mode=>{const values=parseHomeTexts(settings[`home_content_${mode}`],mode);return <details key={mode} className="info-seo-card"><summary>Configuración guardada · {mode==='classic'?'clásico':'compacto'}{mode===layout?' · activo':''}</summary><dl className="info-seo-values"><dt>Título SEO</dt><dd>{values.seoTitle}</dd><dt>Descripción SEO</dt><dd>{values.seoDescription}</dd><dt>Título social</dt><dd>{values.socialTitle||values.seoTitle}</dd><dt>Descripción social</dt><dd>{values.socialDescription||values.seoDescription}</dd></dl></details>;})}</section></> : data ? <ReviewScope resource="settings:site" revision={revision ?? 0}>
      {query.saved === '1' ? <p className="admin-success" role="status">Metadatos de esta página guardados.</p> : null}
      <InformationSeoEditor key={id} pageId={id} defaults={data.defaults} initial={data.overrides} indexingEnabled={data.indexingEnabled} revision={revision ?? 0} snapshot={await informationSeoSnapshot(data)} />
    </ReviewScope> : null}
    <p className="info-seo-note">No hay cambios automáticos, generación con IA ni análisis por palabras clave. Las canónicas y rutas siguen gestionadas por el sitio. Las áreas privadas no se pueden seleccionar ni habilitar para indexación.</p>
  </div></AdminShell>;
}
