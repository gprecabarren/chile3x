"use client";

import { useState } from "react";
import { AnalyticsEvent } from "@/app/AnalyticsEvent";

export function ProfileSubmissionConfirmation({ profileId, profileType }: { profileId: string; profileType: "escort" | "agency" | "rental" }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  function close() {
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    window.history.replaceState({}, "", url);
  }

  return <div className="profile-submission-backdrop" role="presentation">
    <AnalyticsEvent event="profile_submission" parameters={{ profile_type: profileType }} dedupeKey={profileId} />
    <section className="profile-submission-confirmation" role="dialog" aria-modal="true" aria-labelledby="submission-title">
      <p className="eyebrow">DATOS RECIBIDOS</p>
      <h2 id="submission-title">Tu publicación fue enviada a revisión.</h2>
      <p>El aviso todavía no es público: el equipo Chile3X debe aprobarlo antes de mostrarlo en el directorio.</p>
      <div className="profile-submission-next-steps">
        <strong>Mientras tanto puedes completar:</strong>
        <ul>
          {profileType === "escort" && <li>Carnet o examen médico privado, si deseas adjuntarlos.</li>}
          <li>Foto de perfil y galería pública de fotos o videos.</li>
          <li>Galería privada para personas que autorices.</li>
        </ul>
      </div>
      <button className="button button-primary" type="button" onClick={close}>Continuar completando</button>
    </section>
  </div>;
}
