"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type Initial = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  coverMediaId: string | null;
  status: string;
  seoTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  noindex: boolean;
};

function slugFromTitle(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 88);
}

export function AdminNewsEditor({ initial }: { initial?: Initial }) {
  const editor = useRef<HTMLDivElement>(null);
  const hidden = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const [coverId, setCoverId] = useState(initial?.coverMediaId ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverMediaId ? `/noticias/media/${initial.coverMediaId}` : "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function sync() {
    if (hidden.current) hidden.current.value = editor.current?.innerHTML ?? "";
  }

  function command(name: string, value?: string) {
    editor.current?.focus();
    document.execCommand(name, false, value);
    sync();
  }

  function insertEditorImage(url: string) {
    const surface = editor.current;
    if (!surface) return;
    const alt = window.prompt("Describe la imagen para accesibilidad y SEO:", "Imagen de la noticia")?.trim() || "Imagen de la noticia";
    const caption = window.prompt("Pie de foto (opcional):", "")?.trim() || "";
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    image.src = url;
    image.alt = alt.slice(0, 160);
    figure.appendChild(image);
    if (caption) {
      const text = document.createElement("figcaption");
      text.textContent = caption.slice(0, 240);
      figure.appendChild(text);
    }
    surface.appendChild(figure);
    surface.appendChild(document.createElement("p"));
    sync();
  }

  async function upload(file: File | undefined, cover: boolean) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5_000_000) {
      setNotice("La imagen debe ser JPG, PNG o WebP y pesar hasta 5 MB.");
      return;
    }
    setBusy(true);
    setNotice("");
    const data = new FormData();
    data.set("file", file);
    try {
      const response = await fetch("/api/admin/noticias/media", { method: "POST", body: data });
      const payload = await response.json() as { error?: string; id?: string; url?: string };
      if (!response.ok || !payload.id || !payload.url) throw new Error(payload.error ?? "No se pudo subir la imagen.");
      if (cover) {
        setCoverId(payload.id);
        setCoverUrl(payload.url);
      } else {
        insertEditorImage(payload.url);
      }
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "No se pudo subir la imagen.");
    } finally {
      setBusy(false);
      if (imageInput.current) imageInput.current.value = "";
    }
  }

  function autoCompleteSeo(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const get = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null)?.value.trim() ?? "";
    const setIfEmpty = (name: string, value: string) => {
      const field = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (field && !field.value.trim()) field.value = value;
    };
    const title = get("title");
    const excerpt = get("excerpt");
    const articleText = editor.current?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const slug = get("slug") || slugFromTitle(title);
    const description = (excerpt || articleText).slice(0, 160);
    const seoTitle = title ? `${title.slice(0, 54)} | Chile3X` : "Noticias de escorts en Chile | Chile3X";
    setIfEmpty("seo_title", seoTitle.slice(0, 70));
    setIfEmpty("meta_description", description);
    setIfEmpty("focus_keyword", title.split(/[|:–-]/)[0]?.trim().slice(0, 100) || "escorts en Chile");
    setIfEmpty("canonical_url", slug ? `https://chile3x.cl/noticias/${slug}` : "");
    setIfEmpty("og_title", seoTitle.slice(0, 100));
    setIfEmpty("og_description", description);
    setNotice("Propuesta SEO creada. Puedes editarla antes de guardar.");
  }

  return <form className="admin-news-editor" action={initial ? `/api/admin/noticias/${initial.id}` : "/api/admin/noticias"} method="post" onSubmit={sync}>
    <div className="admin-news-main">
      <label>Título<input name="title" required minLength={5} maxLength={140} defaultValue={initial?.title} /></label>
      <label>URL amigable<input name="slug" maxLength={88} defaultValue={initial?.slug} placeholder="se genera desde el título" /></label>
      <label>Resumen<textarea name="excerpt" maxLength={280} rows={3} defaultValue={initial?.excerpt} /></label>
      <div className="rich-news-editor">
        <span>Contenido</span>
        <div className="rich-news-toolbar" aria-label="Herramientas de edición">
          <button type="button" onClick={() => command("formatBlock", "p")}>Párrafo</button>
          <button type="button" onClick={() => command("bold")}><b>B</b></button>
          <button type="button" onClick={() => command("italic")}><i>I</i></button>
          <button type="button" onClick={() => command("underline")}><u>U</u></button>
          <button type="button" onClick={() => command("formatBlock", "h2")}>H2</button>
          <button type="button" onClick={() => command("formatBlock", "h3")}>H3</button>
          <button type="button" onClick={() => command("formatBlock", "blockquote")}>Cita</button>
          <button type="button" onClick={() => command("insertUnorderedList")}>Lista</button>
          <button type="button" onClick={() => command("insertOrderedList")}>Numerada</button>
          <button type="button" onClick={() => { const url = window.prompt("URL segura https://"); if (url) command("createLink", url); }}>Enlace</button>
          <label>{busy ? "Subiendo…" : "Imagen"}<input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0], false)} /></label>
        </div>
        <div ref={editor} className="rich-news-content" contentEditable suppressContentEditableWarning onInput={sync} dangerouslySetInnerHTML={{ __html: initial?.contentHtml ?? "<p>Escribe aquí la noticia.</p>" }} />
        <input ref={hidden} type="hidden" name="content_html" defaultValue={initial?.contentHtml ?? "<p>Escribe aquí la noticia.</p>"} />
      </div>
    </div>
    <aside className="admin-news-sidebar">
      <label>Estado<select name="status" defaultValue={initial?.status ?? "draft"}><option value="draft">Borrador</option><option value="published">Publicada</option></select></label>
      <div className="news-cover-uploader"><span>Imagen de portada</span>{coverUrl && <Image src={coverUrl} alt="Portada actual" width={640} height={360} unoptimized />}<label>{busy ? "Subiendo…" : "Elegir portada"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0], true)} /></label><input type="hidden" name="cover_media_id" value={coverId} /></div>
      <details open><summary>SEO de la noticia</summary><button className="button button-outline news-seo-auto" type="button" onClick={autoCompleteSeo}>Generar propuesta SEO</button><label>Título SEO<input name="seo_title" maxLength={70} defaultValue={initial?.seoTitle ?? ""} /></label><label>Meta descripción<textarea name="meta_description" maxLength={170} rows={3} defaultValue={initial?.metaDescription ?? ""} /></label><label>Palabra clave<input name="focus_keyword" maxLength={100} defaultValue={initial?.focusKeyword ?? ""} /></label><label>URL canónica<input name="canonical_url" type="url" maxLength={500} defaultValue={initial?.canonicalUrl ?? ""} /></label><label>Open Graph título<input name="og_title" maxLength={100} defaultValue={initial?.ogTitle ?? ""} /></label><label>Open Graph descripción<textarea name="og_description" maxLength={200} rows={3} defaultValue={initial?.ogDescription ?? ""} /></label><label className="check-label"><input name="noindex" type="checkbox" defaultChecked={initial?.noindex} /> No indexar</label></details>
      <button className="button button-primary" disabled={busy}>{initial ? "Guardar noticia" : "Crear noticia"}</button>
      {initial && <button className="button button-outline" name="action" value="delete" formNoValidate onClick={(event) => { if (!window.confirm("¿Eliminar esta noticia?")) event.preventDefault(); }}>Eliminar</button>}
      {notice && <p role="status">{notice}</p>}
    </aside>
  </form>;
}
