"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { trackAnalyticsEvent } from "@/app/AnalyticsEvent";
import type { PublicReview } from "@/lib/profile-interactions";
import { TURNSTILE_PROFILE_REVIEW_ACTION, TURNSTILE_PROFILE_REVIEW_SITEKEY } from "@/lib/turnstile";

type TurnstileApi = { render: (element: HTMLElement, options: { sitekey: string; action: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string; reset: (widgetId?: string) => void };

declare global { interface Window { turnstile?: TurnstileApi } }

function ensureTurnstile() {
  return new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const existing = document.getElementById("cf-turnstile-script") as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const onLoad = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("No se pudo cargar la protección antispam."));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("No se pudo cargar la protección antispam.")), { once: true });
    if (!existing) { script.id = "cf-turnstile-script"; script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; script.defer = true; document.head.appendChild(script); }
  });
}

export function ProfileReviews({ profileId, profileSlug, signedIn, viewerOwnsProfile, reviews }: { profileId: string; profileSlug: string; signedIn: boolean; viewerOwnsProfile: boolean; reviews: PublicReview[] }) {
  const widgetElement = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const [token, setToken] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const returnTo = `/perfil/${profileSlug}`;

  useEffect(() => {
    if (!signedIn || viewerOwnsProfile || !widgetElement.current) return;
    let active = true;
    ensureTurnstile().then((turnstile) => {
      if (!active || !widgetElement.current || widgetId.current) return;
      widgetId.current = turnstile.render(widgetElement.current, { sitekey: TURNSTILE_PROFILE_REVIEW_SITEKEY, action: TURNSTILE_PROFILE_REVIEW_ACTION, callback: setToken, "expired-callback": () => setToken(""), "error-callback": () => setToken("") });
    }).catch((error) => active && setNotice(error instanceof Error ? error.message : "No se pudo cargar la protección antispam."));
    return () => { active = false; };
  }, [signedIn, viewerOwnsProfile]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    if (!token) { setNotice("Completa la verificación antispam antes de enviar."); return; }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("body", body);
      formData.set("cf-turnstile-response", token);
      const response = await fetch(`/api/perfiles/${profileId}/resenas`, { method: "POST", body: formData });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo enviar la reseña.");
      setBody(""); setNotice(payload.message ?? "Tu reseña fue enviada a moderación.");
      trackAnalyticsEvent("profile_review_submitted");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo enviar la reseña.");
    } finally {
      setToken(""); window.turnstile?.reset(widgetId.current); setBusy(false);
    }
  }

  return <section className="profile-reviews" aria-label="Reseñas del perfil"><div className="profile-reviews-heading"><div><p className="eyebrow">RESEÑAS</p><h2>Comentarios de la comunidad</h2><span>Las reseñas se publican solo después de la moderación del equipo.</span></div><strong>{reviews.length}</strong></div>
    {reviews.length > 0 ? <div className="profile-review-list">{reviews.map((review) => <article key={review.id}><strong>{review.authorName}</strong><time dateTime={review.createdAt}>{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(review.createdAt))}</time><p>{review.body}</p></article>)}</div> : <p className="profile-reviews-empty">Aún no hay reseñas publicadas para este perfil.</p>}
    {signedIn ? viewerOwnsProfile ? <div className="profile-review-login profile-review-owner-notice"><p>Este es tu anuncio. Para mantener reseñas auténticas, no puedes dejarte comentarios a ti mismo.</p></div> : <form className="profile-review-form" onSubmit={submit}><label>Deja una reseña<textarea value={body} onChange={(event) => setBody(event.target.value)} minLength={3} maxLength={700} required rows={4} placeholder="Comparte una experiencia respetuosa y útil." /></label><div ref={widgetElement} className="turnstile-widget" /><button className="button button-primary" type="submit" disabled={busy || !token}>{busy ? "Enviando…" : "Enviar a moderación"}</button></form> : <div className="profile-review-login"><p>Inicia sesión para dejar una reseña. Todas se revisan antes de publicarse.</p><div><Link className="button button-primary" href={`/ingresar?return_to=${encodeURIComponent(returnTo)}`}>Iniciar sesión</Link><Link className="button button-outline" href={`/registro?return_to=${encodeURIComponent(returnTo)}`}>Crear cuenta</Link></div></div>}
    {notice && <p className="profile-review-notice" role="status">{notice}</p>}
  </section>;
}
