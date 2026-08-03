import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { newsPosts } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { safeNewsCanonicalUrl, sanitizeNewsHtml, textFromHtml, uniqueNewsSlug } from "@/lib/news";

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  if (!await getCurrentAdmin()) return new Response("No autorizado.", { status: 401 });
  const { postId } = await params; const form = await request.formData(); const db = await getDb();
  if (form.get("action") === "delete") { await db.delete(newsPosts).where(eq(newsPosts.id, postId)); return NextResponse.redirect(new URL("/admin/noticias?notice=deleted", request.url), 303); }
  const [existing] = await db.select().from(newsPosts).where(eq(newsPosts.id, postId)).limit(1); if (!existing) return new Response("Noticia no encontrada.", { status: 404 });
  const title = String(form.get("title") ?? "").trim().slice(0, 140); const contentHtml = sanitizeNewsHtml(String(form.get("content_html") ?? ""));
  if (title.length < 5 || textFromHtml(contentHtml).length < 30) return NextResponse.redirect(new URL(`/admin/noticias?error=content&edit=${postId}`, request.url), 303);
  const status = form.get("status") === "published" ? "published" as const : "draft" as const; const now = new Date().toISOString();
  await db.update(newsPosts).set({ title, slug: await uniqueNewsSlug(String(form.get("slug") ?? title), postId), excerpt: String(form.get("excerpt") ?? "").trim().slice(0, 280), contentHtml, coverMediaId: String(form.get("cover_media_id") ?? "").trim() || null, status, seoTitle: String(form.get("seo_title") ?? "").trim().slice(0, 70) || null, metaDescription: String(form.get("meta_description") ?? "").trim().slice(0, 170) || null, focusKeyword: String(form.get("focus_keyword") ?? "").trim().slice(0, 100) || null, canonicalUrl: safeNewsCanonicalUrl(String(form.get("canonical_url") ?? "")), ogTitle: String(form.get("og_title") ?? "").trim().slice(0, 100) || null, ogDescription: String(form.get("og_description") ?? "").trim().slice(0, 200) || null, noindex: form.get("noindex") === "on", publishedAt: status === "published" ? (existing.publishedAt ?? now) : null, updatedAt: now }).where(eq(newsPosts.id, postId));
  return NextResponse.redirect(new URL(`/admin/noticias?notice=updated&edit=${postId}`, request.url), 303);
}
