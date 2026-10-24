'use client';
import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ActionAnchor, ActionButton } from '@/app/ActionButton';
import { INFO_TEXT_LIMITS, INFORMATION_PAGES, resolveInfoSeo, informationTechnicalChecks, infoSeoChanges, infoRobotsChanged, type InformationPageId, type InfoSeoDefaults, type InfoSeoOverrides, type InfoTextField } from '@/lib/information-seo-policy';

const LABELS: Record<keyof InfoSeoOverrides, string> = {
  title: 'Título del resultado (incluye la marca)', description: 'Descripción del resultado',
  socialTitle: 'Título al compartir', socialDescription: 'Descripción al compartir',
  image: 'Ruta de imagen social pública', imageAlt: 'Texto alternativo de la imagen',
  indexing: 'Indexación', following: 'Seguimiento de enlaces', noImageIndex: 'No indexar imágenes',
  noSnippet: 'No mostrar fragmento', maxSnippet: 'Máximo de caracteres del fragmento',
  maxVideoPreview: 'Máximo de segundos de vídeo', maxImagePreview: 'Tamaño máximo de imagen en buscadores',
};
type Props = { pageId: InformationPageId; defaults: InfoSeoDefaults; initial: InfoSeoOverrides; indexingEnabled: boolean; revision: number; snapshot: string };

export function InformationSeoEditor({ pageId, defaults, initial, indexingEnabled, revision, snapshot }: Props) {
  const [draft, setDraft] = useState<InfoSeoOverrides>(initial);
  const [review, setReview] = useState(false), [confirmRobots, setConfirmRobots] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [blocked, setBlocked] = useState(false);
  const [imageError, setImageError] = useState(false), [mobile, setMobile] = useState(false);
  const effective = resolveInfoSeo(defaults, draft, indexingEnabled);
  const invalidImage = !effective.imageUrl || imageError;
  const previous = resolveInfoSeo(defaults, initial, indexingEnabled);
  const assessment = informationTechnicalChecks(defaults, draft, indexingEnabled);
  const changed = infoSeoChanges(initial, draft), robotsChanged = infoRobotsChanged(initial, draft);
  function update(next: InfoSeoOverrides) { setDraft(next); setReview(false); setConfirmRobots(false); setError(''); }
  function reset(field: keyof InfoSeoOverrides) { const next = { ...draft }; delete next[field]; update(next); if (field === 'image') setImageError(false); }
  function textChange(field: InfoTextField, value: string) {
    const next = { ...draft };
    if (value === defaults[field]) delete next[field]; else next[field] = value;
    update(next); if (field === 'image') setImageError(false);
  }
  function textField(field: InfoTextField) {
    const long = field !== 'image', manual = Object.hasOwn(draft, field);
    return <div className={`info-seo-field${long ? ' info-seo-full' : ''}`} key={field}>
      <label htmlFor={`seo-${field}`}>{LABELS[field]}</label>
      {long ? <textarea id={`seo-${field}`} value={effective[field]} rows={field === 'description' || field === 'socialDescription' ? 3 : 2} maxLength={INFO_TEXT_LIMITS[field]} required onChange={event => textChange(field, event.target.value)} />
        : <input id={`seo-${field}`} value={effective[field]} maxLength={INFO_TEXT_LIMITS[field]} required spellCheck={field !== 'image'} onChange={event => textChange(field, event.target.value)} />}
      <small>{effective[field].length} / {INFO_TEXT_LIMITS[field]} caracteres · {manual ? 'Valor personalizado' : defaults.source + (field === 'image' || field === 'imageAlt' ? ' · imagen de respaldo de la marca' : '')}</small>
      <ActionButton className="button button-outline info-seo-reset" type="button" disabled={!manual || busy} onClick={() => reset(field)}>Usar valor de respaldo</ActionButton>
    </div>;
  }
  async function save() {
    if (busy || blocked || !review || !changed.length || (robotsChanged && !confirmRobots) || invalidImage) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/contenido/seo/${pageId}`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ overrides: draft, snapshot, revision, mutationId: crypto.randomUUID(), confirmRobots }), signal: AbortSignal.timeout(30_000) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409 || response.status >= 500 || typeof result?.error !== 'string') setBlocked(true);
        throw new Error(typeof result?.error === 'string' ? result.error : 'No se pudo confirmar el guardado. Abre la configuración actual antes de repetirlo.');
      }
      if (result?.unchanged) { setReview(false); setBusy(false); return; }
      if (typeof result?.redirectTo !== 'string' || !result.redirectTo.startsWith('/admin/contenido/seo/paginas?')) { setBlocked(true); throw new Error('Respuesta no confirmada. Comprueba la configuración actual antes de repetir el guardado.'); }
      location.assign(result.redirectTo);
    } catch (cause) {
      if (!(cause instanceof Error) || cause.name !== 'Error') setBlocked(true);
      setError(cause instanceof Error && cause.name === 'Error' ? cause.message : 'No se pudo confirmar el guardado. Comprueba la configuración actual antes de repetirlo.');
      setBusy(false);
    }
  }
  function prepare(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!busy && !blocked && changed.length && !invalidImage) setReview(true); }
  const robots = [effective.index ? 'index' : 'noindex', effective.follow ? 'follow' : 'nofollow', ...(draft.noImageIndex ? ['noimageindex'] : []), ...(draft.noSnippet ? ['nosnippet'] : []), ...(draft.maxSnippet !== undefined ? [`max-snippet:${draft.maxSnippet}`] : []), ...(draft.maxVideoPreview !== undefined ? [`max-video-preview:${draft.maxVideoPreview}`] : []), ...(draft.maxImagePreview ? [`max-image-preview:${draft.maxImagePreview}`] : [])].join(', ');
  return <div className="info-seo-editor">
    <form onSubmit={prepare} aria-busy={busy}>
      <fieldset disabled={busy} className="info-seo-card"><legend>{INFORMATION_PAGES[pageId].label} · configuración efectiva</legend>
        <p>Los campos ya contienen los textos que se usan ahora. Un valor heredado no está vacío ni sin configurar. «Usar valor de respaldo» elimina únicamente la personalización de ese campo.</p>
        <label htmlFor="seo-canonical">URL pública y canónica (gestionada por el sitio)</label><input id="seo-canonical" readOnly value={effective.canonical} />
        <div className="info-seo-fields">{textField('title')}{textField('description')}</div>
      </fieldset>
      <fieldset disabled={busy} className="info-seo-card"><legend>Vista social · Facebook y X</legend>
        <p>Se comparten título, descripción e imagen entre Open Graph y la tarjeta grande de X. No se publica nada en redes desde aquí.</p>
        <div className="info-seo-fields">{textField('socialTitle')}{textField('socialDescription')}{textField('image')}{textField('imageAlt')}</div>
        <p className="info-seo-note">La imagen debe existir entre los archivos estáticos públicos del sitio. No se admiten archivos privados, enlaces externos, rutas del PC ni SVG. Este editor no sube imágenes ni comprueba sus dimensiones.</p>
      </fieldset>
      <details className="info-seo-card info-seo-advanced"><summary>Opciones avanzadas de indexación y previsualización</summary>
        <p>No es una barrera de privacidad. Para contenido privado se necesitan permisos de acceso. Las restricciones globales tienen prioridad; no se pueden levantar desde esta página.</p>
        {!indexingEnabled ? <p role="status" className="info-seo-warning">La indexación global está desactivada: el resultado seguirá siendo noindex, nofollow.</p> : null}
        <div className="info-seo-fields">
          <label>Indexación<select value={draft.indexing ?? 'inherit'} disabled={busy} onChange={event => event.target.value === 'inherit' ? reset('indexing') : update({ ...draft, indexing: 'noindex' })}><option value="inherit">Heredar configuración global</option><option value="noindex">No indexar esta página</option></select></label>
          <label>Enlaces<select value={draft.following ?? 'inherit'} disabled={busy} onChange={event => event.target.value === 'inherit' ? reset('following') : update({ ...draft, following: 'nofollow' })}><option value="inherit">Heredar configuración global</option><option value="nofollow">Solicitar no seguir enlaces</option></select></label>
          <label className="info-seo-check"><input type="checkbox" checked={draft.noImageIndex ?? false} disabled={busy} onChange={event => event.target.checked ? update({ ...draft, noImageIndex: true }) : reset('noImageIndex')} />No indexar las imágenes de esta página</label>
          <label className="info-seo-check"><input type="checkbox" checked={draft.noSnippet ?? false} disabled={busy} onChange={event => event.target.checked ? update({ ...draft, noSnippet: true }) : reset('noSnippet')} />No mostrar fragmento de texto o vídeo</label>
          {(['maxSnippet', 'maxVideoPreview'] as const).map(field => <label key={field}>{LABELS[field]}<input type="number" min={-1} max={10000} step={1} placeholder="Heredado (sin directiva adicional)" value={draft[field] ?? ''} disabled={busy || draft.noSnippet} onChange={event => event.target.value === '' ? reset(field) : update({ ...draft, [field]: Number(event.target.value) })} /><small>Vacío: heredar. -1: sin límite. 0: sin previsualización.</small></label>)}
          <label>Tamaño máximo de imagen en buscadores<select value={draft.maxImagePreview ?? 'inherit'} disabled={busy} onChange={event => { const value = event.target.value; if (value === 'inherit') reset('maxImagePreview'); else if (value === 'none' || value === 'standard' || value === 'large') update({ ...draft, maxImagePreview: value }); }}><option value="inherit">Heredar (no añadir directiva)</option><option value="none">Sin imagen</option><option value="standard">Estándar</option><option value="large">Grande</option></select></label>
        </div><p>Directiva efectiva: <code>{robots}</code></p>
      </details>
      {error ? <div className="info-seo-warning" role="alert"><p>{error}</p><ActionAnchor className="button button-outline" href={`?pagina=${pageId}`} target="_blank" rel="noopener noreferrer">Abrir configuración actual en otra pestaña</ActionAnchor></div> : null}
      <div className="info-seo-actions"><ActionButton className="button button-primary" type="submit" disabled={busy || blocked || !changed.length || invalidImage}>Revisar {changed.length} {changed.length === 1 ? 'cambio' : 'cambios'}</ActionButton><span role="status">{changed.length ? 'Hay cambios locales sin publicar.' : 'Sin cambios: se conserva la configuración actual.'}</span></div>
      {review ? <section className="info-seo-card info-seo-review" aria-label="Confirmación de cambios"><h2>Revisa antes de publicar</h2><p>Solo cambiarán los siguientes campos de {INFORMATION_PAGES[pageId].label}. No se modifica el contenido visible, el H1, los enlaces, los documentos legales ni otras páginas.</p><dl className="info-seo-values">{changed.map(key => { const field = key as keyof InfoSeoOverrides; return <div key={key}><dt>{LABELS[field]}</dt><dd>Antes: {String(previous[field] ?? 'Heredado')}</dd><dd>Después: {String(effective[field] ?? 'Heredado')}</dd></div>; })}</dl>
        {robotsChanged ? <label className="info-seo-check info-seo-warning"><input type="checkbox" checked={confirmRobots} onChange={event => setConfirmRobots(event.target.checked)} disabled={busy} />Confirmo los cambios de indexación y previsualización indicados. Entiendo que pueden cambiar la presencia de esta página en buscadores.</label> : null}
        <div className="info-seo-actions"><ActionButton className="button button-primary" type="button" disabled={busy || blocked || invalidImage || (robotsChanged && !confirmRobots)} onClick={() => void save()}>{busy ? 'Guardando…' : 'Aplicar cambios de esta página'}</ActionButton><ActionButton className="button button-outline" type="button" disabled={busy} onClick={() => setReview(false)}>Seguir editando</ActionButton></div>
      </section> : null}
    </form>
    <aside className="info-seo-previews" aria-label="Previsualización y comprobaciones técnicas">
      <section className="info-seo-card"><h2>Vista orientativa del buscador</h2><div className="info-seo-actions"><ActionButton type="button" className="button button-outline" aria-pressed={!mobile} onClick={() => setMobile(false)}>Escritorio</ActionButton><ActionButton type="button" className="button button-outline" aria-pressed={mobile} onClick={() => setMobile(true)}>Móvil</ActionButton></div><div className={`info-seo-snippet${mobile ? ' is-mobile' : ''}`}><span>{effective.canonical}</span><h3>{effective.title}</h3><p>{effective.description}</p></div><p className="info-seo-note">Google puede modificar textos y recortes. Esta simulación no representa una vista real de Google ni mide píxeles de su interfaz.</p></section>
      <section className="info-seo-card"><h2>Tarjeta social</h2><div className="info-seo-social">{effective.imageUrl ? <Image key={effective.imageUrl} src={effective.imageUrl} alt={effective.imageAlt} width={600} height={315} unoptimized onLoad={() => setImageError(false)} onError={() => setImageError(true)} /> : null}<div><small>{defaults.origin}</small><h3>{effective.socialTitle}</h3><p>{effective.socialDescription}</p></div></div>{invalidImage ? <p className="info-seo-warning" role="alert">No se pudo cargar la imagen o la ruta no está permitida. Revisa la ruta antes de guardar.</p> : null}</section>
      <section className="info-seo-card"><h2>Comprobación técnica</h2><p className="info-seo-score"><strong>{assessment.score}/100</strong> · campos configurados</p><ul>{assessment.checks.map(check => <li key={check.label}>{check.ok ? '✓' : 'Revisar:'} {check.label}</li>)}</ul><p className="info-seo-note">No es el puntaje de Rank Math ni evalúa palabras clave, tráfico, autoridad, contenido, posiciones o si Google ha indexado la página. Un noindex intencional no resta puntos.</p></section>
    </aside>
  </div>;
}
