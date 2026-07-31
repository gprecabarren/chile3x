"use client";

import Link from "next/link";
import { useState } from "react";

type Engagement = {
  favoritesCount: number;
  likesCount: number;
  viewerHasFavorite: boolean;
  viewerHasLike: boolean;
};

type Action = "favorite" | "like";

export function ProfileEngagementActions({
  profileId,
  profileSlug,
  signedIn,
  initialEngagement,
}: {
  profileId: string;
  profileSlug: string;
  signedIn: boolean;
  initialEngagement: Engagement;
}) {
  const [engagement, setEngagement] = useState(initialEngagement);
  const [notice, setNotice] = useState("");
  const [promptVisible, setPromptVisible] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const returnTo = `/perfil/${profileSlug}`;
  const loginHref = `/ingresar?return_to=${encodeURIComponent(returnTo)}`;
  const registerHref = `/registro?return_to=${encodeURIComponent(returnTo)}`;

  async function toggle(action: Action) {
    setNotice("");
    if (!signedIn) {
      setPromptVisible(true);
      return;
    }

    setBusy(action);
    try {
      const response = await fetch(`/api/perfiles/${profileId}/${action === "favorite" ? "favorito" : "like"}`, { method: "POST" });
      const payload = await response.json() as Engagement & { error?: string; saved?: boolean; liked?: boolean };
      if (!response.ok) {
        if (response.status === 401) setPromptVisible(true);
        throw new Error(payload.error ?? "No se pudo guardar tu interacción.");
      }
      setEngagement(payload);
      setNotice(action === "favorite"
        ? (payload.saved ? "Perfil guardado en favoritos." : "Perfil quitado de favoritos.")
        : (payload.liked ? "Te gusta este perfil." : "Quitaste tu like."));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar tu interacción.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="profile-engagement" aria-label="Interacciones del perfil">
    <div className="profile-engagement-actions">
      <button type="button" className={engagement.viewerHasFavorite ? "is-active" : ""} aria-pressed={engagement.viewerHasFavorite} disabled={busy !== null} onClick={() => toggle("favorite")}>
        <span aria-hidden="true">{engagement.viewerHasFavorite ? "♥" : "♡"}</span>{engagement.viewerHasFavorite ? "Guardado" : "Favorito"}<small>{engagement.favoritesCount}</small>
      </button>
      <button type="button" className={engagement.viewerHasLike ? "is-active" : ""} aria-pressed={engagement.viewerHasLike} disabled={busy !== null} onClick={() => toggle("like")}>
        <span aria-hidden="true">{engagement.viewerHasLike ? "♥" : "♡"}</span>{engagement.viewerHasLike ? "Te gusta" : "Me gusta"}<small>{engagement.likesCount}</small>
      </button>
    </div>
    {notice && <p className="profile-engagement-notice" role="status">{notice}</p>}
    {promptVisible && <div className="profile-engagement-login" role="status">
      <div><strong>Guarda y reacciona con tu cuenta</strong><p>Inicia sesión o crea una cuenta para usar favoritos, likes y reseñas.</p></div>
      <div><Link className="button button-primary" href={loginHref}>Iniciar sesión</Link><Link className="button button-outline" href={registerHref}>Crear cuenta</Link></div>
    </div>}
  </section>;
}
