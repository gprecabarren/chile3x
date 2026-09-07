"use client";

import Image from "next/image";
import { useRef } from "react";

function verificationMonth(value: string | null) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "recientemente";
  return `desde ${new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "America/Santiago" }).format(date)}`;
}

export function ProfileVerificationBadge({ displayName, imageUrl, verifiedAt }: { displayName: string; imageUrl: string | null; verifiedAt: string | null }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return <>
    <button className="verified-sticker" type="button" title="Ver detalles de la verificación" aria-label={`Ver verificación de ${displayName}`} onClick={() => dialogRef.current?.showModal()}>✓</button>
    <dialog className="profile-verification-dialog" ref={dialogRef} onClick={(event) => {
      if (event.target === dialogRef.current) dialogRef.current?.close();
    }}>
      <section>
        <button className="profile-verification-close" type="button" aria-label="Cerrar información de verificación" onClick={() => dialogRef.current?.close()}>×</button>
        <div className="profile-verification-main">
          <p className="eyebrow">PERFIL VERIFICADO</p>
          <div className="profile-verification-identity">
            <span className="profile-verification-photo">
              {imageUrl ? <Image src={imageUrl} alt={`Foto principal de ${displayName}`} fill unoptimized sizes="72px" /> : <b>{displayName.slice(0, 1)}</b>}
            </span>
            <div><h2>{displayName}</h2><p>Verificación aprobada {verificationMonth(verifiedAt)}</p></div>
          </div>
          <ul>
            <li><span aria-hidden="true">✓</span> Identidad comprobada</li>
            <li><span aria-hidden="true">✓</span> Documento revisado</li>
          </ul>
          <p className="profile-verification-trust"><span aria-hidden="true">✓</span> Perfiles revisados, mayor confianza.</p>
        </div>
        <div className="profile-verification-note">La identidad fue revisada con antecedentes entregados al sitio web. Este distintivo no reemplaza las medidas de cuidado al coordinar un encuentro.</div>
      </section>
    </dialog>
  </>;
}
