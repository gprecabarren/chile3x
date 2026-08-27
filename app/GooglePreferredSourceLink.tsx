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

function GoogleColorMark() {
  return <svg className="google-preferred-source-google-g" aria-hidden="true" viewBox="0 0 18 18" focusable="false">
    <path fill="#EA4335" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.702-1.568 2.684-3.878 2.684-6.615Z" />
    <path fill="#4285F4" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.91-2.258c-.806.54-1.835.859-3.046.859-2.345 0-4.333-1.585-5.043-3.71H.993v2.33A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.957 10.711A5.41 5.41 0 0 1 3.675 9c0-.594.102-1.172.282-1.711V4.96H.993A9 9 0 0 0 0 9c0 1.452.348 2.827.993 4.04l2.964-2.329Z" />
    <path fill="#34A853" d="M9 3.58c1.322 0 2.51.455 3.444 1.348l2.585-2.585C13.463.89 11.426 0 9 0A9 9 0 0 0 .993 4.96l2.964 2.329C4.667 5.165 6.655 3.58 9 3.58Z" />
  </svg>;
}

export function GooglePreferredSourceLink({ placement = "footer" }: { placement?: "footer" | "home" }) {
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

  return (
    <a
      className={`google-preferred-source google-preferred-source-${placement}`}
      href={preferredSourceUrl}
      onClick={handleClick}
      aria-label="Preferir Chile3X en Google"
      title="Preferir Chile3X en Google"
    >
      <GoogleColorMark />
      <span className="google-preferred-source-label">Preferir en Google</span>
    </a>
  );
}
