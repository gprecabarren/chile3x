// Pure, shared policy. These controls apply only to informational documents;
// private pages, catalogs, advertisements and the Home are not editable here.
export const INFORMATION_PAGES = {
  contacto: { path: '/contacto', label: 'Contacto' },
  faq: { path: '/faq', label: 'Preguntas frecuentes' },
  terminos: { path: '/terminos', label: 'Términos' },
  privacidad: { path: '/privacidad', label: 'Privacidad' },
  reglas: { path: '/reglas-de-publicacion', label: 'Reglas de publicación' },
} as const;
export type InformationPageId = keyof typeof INFORMATION_PAGES;
export function informationPageId(value: unknown): InformationPageId | null {
  return typeof value === 'string' && Object.hasOwn(INFORMATION_PAGES, value) ? value as InformationPageId : null;
}
export const INFO_TEXT_LIMITS = { title: 180, description: 320, socialTitle: 180, socialDescription: 320, image: 500, imageAlt: 220 } as const;
export type InfoTextField = keyof typeof INFO_TEXT_LIMITS;
export type InfoSeoDefaults = Record<InfoTextField, string> & { path: string; origin: string; source: string };
export type InfoSeoOverrides = Partial<Record<InfoTextField, string>> & {
  indexing?: 'noindex'; following?: 'nofollow'; noImageIndex?: boolean; noSnippet?: boolean;
  maxSnippet?: number; maxVideoPreview?: number; maxImagePreview?: 'none' | 'standard' | 'large';
};
export const INFO_SETTING_KEYS = {
  contacto: 'seo_info_contacto', faq: 'seo_info_faq', terminos: 'seo_info_terminos',
  privacidad: 'seo_info_privacidad', reglas: 'seo_info_reglas',
} as const;

/** Static same-origin raster assets only. No private media, remote fetch,
 * tracking hosts, SVG/script payloads, local filesystem or loopback URLs. */
export function informationImagePath(value: string, origin: string): string | null {
  try {
    if (/[\\%\s\u0000-\u001f]/.test(value) || /(?:^|\/)\.\.?(?:\/|$)/.test(value)) return null;
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password || url.hash) return null;
    const path = url.pathname + url.search;
    return /^\/(?:assets\/)?[A-Za-z0-9][A-Za-z0-9_.-]*\.(?:png|jpe?g|webp)(?:\?v=[A-Za-z0-9_-]+)?$/i.test(path) ? path : null;
  } catch { return null; }
}

export function parseInfoSeoOverrides(input: unknown, origin: string): InfoSeoOverrides {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('La configuración debe ser un objeto.');
  const allowed = new Set([...Object.keys(INFO_TEXT_LIMITS), 'indexing', 'following', 'noImageIndex', 'noSnippet', 'maxSnippet', 'maxVideoPreview', 'maxImagePreview']);
  const result: InfoSeoOverrides = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) throw new Error('Hay un campo no permitido.');
    if (Object.hasOwn(INFO_TEXT_LIMITS, key)) {
      const field = key as InfoTextField;
      if (typeof value !== 'string' || !value.trim() || value.length > INFO_TEXT_LIMITS[field] || /[<>\u0000-\u001f\u007f]|[A-Z]:[\\/]+Users[\\/]+/i.test(value)) throw new Error(`Revisa el campo ${key}: usa texto sin HTML ni rutas locales.`);
      const text = value.trim();
      if (field === 'image') {
        const path = informationImagePath(text, origin);
        if (!path) throw new Error('La imagen debe ser un recurso estático público del mismo sitio (PNG, JPG o WebP).');
        result.image = path;
      } else result[field] = text;
    } else if (key === 'indexing') {
      if (value !== 'noindex') throw new Error('Indexación no válida.');
      result.indexing = value;
    } else if (key === 'following') {
      if (value !== 'nofollow') throw new Error('Seguimiento no válido.');
      result.following = value;
    } else if (key === 'noImageIndex' || key === 'noSnippet') {
      if (typeof value !== 'boolean') throw new Error('Directiva no válida.');
      if (value) result[key] = true;
    } else if (key === 'maxSnippet' || key === 'maxVideoPreview') {
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < -1 || value > 10000) throw new Error('El límite debe ser un entero entre -1 y 10000.');
      result[key] = value;
    } else if (key === 'maxImagePreview') {
      if (value !== 'none' && value !== 'standard' && value !== 'large') throw new Error('Vista de imagen no válida.');
      result.maxImagePreview = value;
    }
  }
  return result;
}

export function readInfoSeoOverrides(value: string, origin: string): InfoSeoOverrides {
  if (!value) return {};
  // Do not silently replace a damaged stored configuration with empty fields.
  return parseInfoSeoOverrides(JSON.parse(value), origin);
}

export function resolveInfoSeo(defaults: InfoSeoDefaults, overrides: InfoSeoOverrides, indexingEnabled: boolean) {
  const text = { ...defaults, ...overrides };
  return {
    ...text, canonical: new URL(defaults.path, defaults.origin).href,
    imageUrl: informationImagePath(text.image, defaults.origin) ? new URL(text.image, defaults.origin).href : '',
    index: indexingEnabled && overrides.indexing !== 'noindex',
    follow: indexingEnabled && overrides.following !== 'nofollow',
  };
}

/** Technical completeness only; never a ranking/keyword or content score.
 * Intentional noindex and preview restrictions do not reduce the score. */
export function informationTechnicalChecks(defaults: InfoSeoDefaults, overrides: InfoSeoOverrides, indexingEnabled: boolean) {
  const value = resolveInfoSeo(defaults, overrides, indexingEnabled);
  const checks = [
    { label: 'Título definido', ok: !!value.title.trim() },
    { label: 'Descripción definida', ok: !!value.description.trim() },
    { label: 'Canónica estable de la propia página', ok: value.canonical === defaults.origin + defaults.path },
    { label: 'Dominio público HTTPS', ok: /^https:\/\//.test(defaults.origin) },
    { label: 'Título social definido', ok: !!value.socialTitle.trim() },
    { label: 'Descripción social definida', ok: !!value.socialDescription.trim() },
    { label: 'Imagen pública del propio sitio', ok: informationImagePath(value.image, defaults.origin) !== null },
    { label: 'Texto alternativo de la imagen', ok: !!value.imageAlt.trim() },
  ];
  return { score: Math.round(checks.filter(check => check.ok).length / checks.length * 100), checks };
}

export function infoSeoChanges(before: InfoSeoOverrides, after: InfoSeoOverrides) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => before[key as keyof InfoSeoOverrides] !== after[key as keyof InfoSeoOverrides]);
}

export function infoRobotsChanged(before: InfoSeoOverrides, after: InfoSeoOverrides) {
  return infoSeoChanges(before, after).some(key => !Object.hasOwn(INFO_TEXT_LIMITS, key));
}
