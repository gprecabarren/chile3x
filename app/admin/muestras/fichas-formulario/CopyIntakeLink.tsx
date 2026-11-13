"use client";

import { useState } from "react";
import { ActionButton } from "@/app/ActionButton";
import { ActionIcon } from "@/app/ActionIcon";

export function CopyIntakeLink() {
  const [status, setStatus] = useState("");
  return <div className="intake-copy-link">
    <ActionButton className="button button-primary" type="button" onClick={async () => {
      try {
        await navigator.clipboard.writeText(new URL("/ficha-escort", window.location.origin).href);
        setStatus("Enlace copiado.");
      } catch {
        setStatus("Abre el formulario y copia la dirección desde el navegador.");
      }
    }}><ActionIcon name="copy" />Copiar enlace del formulario</ActionButton>
    {status && <small role="status">{status}</small>}
  </div>;
}
