"use client";

import type { MouseEvent } from "react";

const preferredSourceUrl = "https://www.google.com/preferences/source?q=chile3x.cl";

type PreferredSourceClient = {
  addPreferredSource: () => void;
};

declare global {
  interface Window {
    __chile3xPreferredSource?: PreferredSourceClient;
  }
}

type GooglePreferredSourceLinkProps = {
  placement: "header" | "footer";
};

export function GooglePreferredSourceLink({ placement }: GooglePreferredSourceLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const preferredSource = window.__chile3xPreferredSource;

    if (!preferredSource) return;

    event.preventDefault();

    try {
      preferredSource.addPreferredSource();
    } catch {
      window.location.assign(preferredSourceUrl);
    }
  };

  if (placement === "footer") {
    return (
      <div className="google-preferred-source-footer">
        <strong>FUENTE PREFERIDA</strong>
        <a
          className="google-preferred-source google-preferred-source-footer-link"
          href={preferredSourceUrl}
          onClick={handleClick}
          aria-label="Agregar Chile3X como fuente preferida en Google"
        >
          <span className="google-preferred-source-symbol" aria-hidden="true">+</span>
          <span>Agregar Chile3X como fuente preferida en Google</span>
        </a>
        <small>Opcional. Ayuda a encontrar las noticias de Chile3X en los resultados de Google.</small>
      </div>
    );
  }

  return (
    <a
      className="google-preferred-source google-preferred-source-header"
      href={preferredSourceUrl}
      onClick={handleClick}
      aria-label="Agregar Chile3X como fuente preferida en Google"
      title="Agregar Chile3X como fuente preferida en Google"
    >
      <span className="google-preferred-source-symbol" aria-hidden="true">+</span>
      <span>Preferir en Google</span>
    </a>
  );
}
