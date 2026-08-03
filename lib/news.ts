import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { newsMedia, newsPosts } from "@/db/schema";

const allowedTags = new Set(["a", "b", "blockquote", "br", "em", "figcaption", "figure", "h2", "h3", "hr", "i", "img", "li", "ol", "p", "span", "strong", "u", "ul"]);
function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }
function safeUrl(value: string, image = false) { const trimmed = value.trim(); if (trimmed.startsWith("/noticias/media/") || /^https:\/\//i.test(trimmed) || (!image && /^(mailto:|tel:)/i.test(trimmed))) return trimmed; return ""; }
function safeAttributes(tag: string, raw: string) {
  const attrs: string[] = [];
  for (const match of raw.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    const name = match[1].toLowerCase(); const value = match[3] ?? match[4] ?? match[5] ?? "";
    if (name.startsWith("on")) continue;
    if (tag === "a" && name === "href") { const href = safeUrl(value); if (href) attrs.push(`href="${escapeHtml(href)}"`); }
    if (tag === "img" && name === "src") { const src = safeUrl(value, true); if (src) attrs.push(`src="${escapeHtml(src)}"`); }
    if (tag === "img" && name === "alt") attrs.push(`alt="${escapeHtml(value).slice(0, 160)}"`);
  }
  if (tag === "a" && !attrs.some((item) => item.startsWith("href="))) return "";
  if (tag === "a") attrs.push('rel="noreferrer"');
  if (tag === "img" && !attrs.some((item) => item.startsWith("src="))) return "";
  if (tag === "img") attrs.push('loading="lazy"');
  return attrs.length ? ` ${attrs.join(" ")}` : "";
}
export function sanitizeNewsHtml(html: string) {
  const cleaned = html.slice(0, 100_000).replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "").replace(/<\s*(script|style|iframe|object|embed)[^>]*\/?\s*>/gi, "");
  return cleaned.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, rawTag, rawAttrs) => { const tag = String(rawTag).toLowerCase(); if (!allowedTags.has(tag)) return ""; if (full.startsWith("</")) return `</${tag}>`; const attrs = safeAttributes(tag, String(rawAttrs)); if ((tag === "a" || tag === "img") && !attrs) return ""; return `<${tag}${attrs}>`; });
}
export function textFromHtml(html: string) { return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
export function newsSlug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 88) || `noticia-${Date.now()}`; }
export function safeNewsCanonicalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && url.hostname === "chile3x.cl" && url.pathname.startsWith("/noticias/")
      ? url.toString().slice(0, 500)
      : null;
  } catch {
    return null;
  }
}
export async function uniqueNewsSlug(value: string, currentId?: string) { const db = await getDb(); const base = newsSlug(value); let candidate = base; let suffix = 2; while (true) { const conditions = [eq(newsPosts.slug, candidate), ...(currentId ? [ne(newsPosts.id, currentId)] : [])]; const row = await db.select({ id: newsPosts.id }).from(newsPosts).where(and(...conditions)).limit(1); if (!row.length) return candidate; candidate = `${base}-${suffix++}`; } }
export async function listNews(includeDrafts = false) { const rows = await (await getDb()).select({ post: newsPosts, cover: newsMedia }).from(newsPosts).leftJoin(newsMedia, eq(newsPosts.coverMediaId, newsMedia.id)).where(includeDrafts ? undefined : eq(newsPosts.status, "published")).orderBy(desc(newsPosts.publishedAt), desc(newsPosts.createdAt)); return rows; }
export async function getNewsBySlug(slug: string, includeDrafts = false) { const [row] = await (await getDb()).select({ post: newsPosts, cover: newsMedia }).from(newsPosts).leftJoin(newsMedia, eq(newsPosts.coverMediaId, newsMedia.id)).where(and(eq(newsPosts.slug, slug), ...(includeDrafts ? [] : [eq(newsPosts.status, "published")]))).limit(1); return row ?? null; }
