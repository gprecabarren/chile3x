import type { Metadata } from 'next';
import { getSiteSettings, siteBaseUrl } from '@/lib/site-settings';
import { getPublishedLegalDocument } from '@/lib/legal-documents';
import { publicPageMetadata, socialCardImage, socialCardImageUrl } from '@/lib/seo';
import { INFORMATION_PAGES, INFO_SETTING_KEYS, readInfoSeoOverrides, resolveInfoSeo, type InformationPageId, type InfoSeoDefaults } from './information-seo-policy';
import { INFORMATION_SEO_DEFAULTS } from './information-seo-defaults';

// Existing published defaults feed both the public document and private editor.

export async function getInformationSeo(pageId: InformationPageId) {
  const settings = await getSiteSettings();
  const page = INFORMATION_PAGES[pageId];
  const original = pageId === 'terminos' || pageId === 'privacidad'
    ? (await getPublishedLegalDocument(pageId === 'terminos' ? 'terms' : 'privacy')).document
    : INFORMATION_SEO_DEFAULTS[pageId];
  const socialTitle = 'socialTitle' in original ? String(original.socialTitle) : `${original.title} | Chile3X`;
  const socialDescription = 'socialDescription' in original ? String(original.socialDescription) : original.description;
  const defaults: InfoSeoDefaults = {
    title: `${original.title} | Chile3X`, description: original.description,
    socialTitle, socialDescription,
    image: socialCardImageUrl, imageAlt: socialCardImage.alt,
    path: page.path, origin: siteBaseUrl(settings.site_url),
    source: pageId === 'terminos' || pageId === 'privacidad' ? 'Documento legal publicado' : 'Configuración de la página',
  };
  const overrides = readInfoSeoOverrides(settings[INFO_SETTING_KEYS[pageId]], defaults.origin);
  const indexingEnabled = settings.robots_indexing === 'enabled';
  return { pageId, page, defaults, overrides, indexingEnabled, effective: resolveInfoSeo(defaults, overrides, indexingEnabled) };
}

/** Blank installation is a strict no-op, preserving existing metadata output. */
export async function informationPageMetadata(pageId: InformationPageId): Promise<Metadata> {
  const { defaults, overrides, effective } = await getInformationSeo(pageId);
  const base = publicPageMetadata({
    title: defaults.title.slice(0, -' | Chile3X'.length), description: defaults.description,
    path: defaults.path, socialTitle: defaults.socialTitle, socialDescription: defaults.socialDescription,
  });
  if (pageId === 'nosotros') base.title = { absolute: defaults.title };
  if (!Object.keys(overrides).length) return base;
  const image = { url: effective.image, alt: effective.imageAlt, ...(!overrides.image ? { width: socialCardImage.width, height: socialCardImage.height } : {}) };
  const hasRobots = ['indexing', 'following', 'noImageIndex', 'noSnippet', 'maxSnippet', 'maxVideoPreview', 'maxImagePreview'].some(key => Object.hasOwn(overrides, key));
  return {
    ...base, title: { absolute: effective.title }, description: effective.description,
    openGraph: { ...base.openGraph, title: effective.socialTitle, description: effective.socialDescription, images: [image] },
    twitter: { card: 'summary_large_image', title: effective.socialTitle, description: effective.socialDescription, images: [effective.image] },
    ...(hasRobots ? { robots: {
      index: effective.index, follow: effective.follow,
      ...(overrides.noImageIndex ? { noimageindex: true } : {}),
      ...(overrides.noSnippet ? { nosnippet: true } : {}),
      ...(overrides.maxSnippet !== undefined ? { 'max-snippet': overrides.maxSnippet } : {}),
      ...(overrides.maxVideoPreview !== undefined ? { 'max-video-preview': overrides.maxVideoPreview } : {}),
      ...(overrides.maxImagePreview !== undefined ? { 'max-image-preview': overrides.maxImagePreview } : {}),
    } } : {}),
  };
}

export async function informationSeoSnapshot(value: Awaited<ReturnType<typeof getInformationSeo>>) {
  const bytes = new TextEncoder().encode(JSON.stringify([value.defaults, value.overrides, value.indexingEnabled]));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
