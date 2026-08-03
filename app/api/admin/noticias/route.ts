import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { newsPosts } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { safeNewsCanonicalUrl, sanitizeNewsHtml, textFromHtml, uniqueNewsSlug } from "@/lib/news";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin(); if (!admin) return new Response("No autorizado.", { status: 401 });
  const form = await request.formData(); const title = String(form.get("title") ?? "").trim().slice(0, 140); const contentHtml = sanitizeNewsHtml(String(form.get("content_html") ?? ""));
  if (title.length < 5 || textFromHtml(contentHtml).length < 30) return NextResponse.redirect(new URL("/admin/noticias?error=content", request.url), 303);
  const status = form.get("status") === "published" ? "published" as const : "draft" as const; const now = new Date().toISOString();
  const id = `news_${crypto.randomUUID()}`; const slug = await uniqueNewsSlug(String(form.get("slug") ?? title));
  await (await getDb()).insert(newsPosts).values({ id, authorId: admin.id, title, slug, excerpt: String(form.get("excerpt") ?? "").trim().slice(0, 280), contentHtml, coverMediaId: String(form.get("cover_media_id") ?? "").trim() || null, status, seoTitle: String(form.get("seo_title") ?? "").trim().slice(0, 70) || null, metaDescription: String(form.get("meta_description") ?? "").trim().slice(0, 170) || null, focusKeyword: String(form.get("focus_keyword") ?? "").trim().slice(0, 100) || null, canonicalUrl: safeNewsCanonicalUrl(String(form.get("canonical_url") ?? "")), ogTitle: String(form.get("og_title") ?? "").trim().slice(0, 100) || null, ogDescription: String(form.get("og_description") ?? "").trim().slice(0, 200) || null, noindex: form.get("noindex") === "on", publishedAt: status === "published" ? now : null, updatedAt: now });
  return NextResponse.redirect(new URL(`/admin/noticias?notice=created&edit=${id}`, request.url), 303);
}
