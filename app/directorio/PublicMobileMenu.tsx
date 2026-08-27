"use client";

import Link from "next/link";
import { useState } from "react";

type PublicMobileMenuProps = {
  coverageHref: string;
};

const directoryLinks = [
  ["Escorts", "/escorts"],
  ["Agencias", "/agencias"],
  ["Arriendos", "/arriendos"],
] as const;

const portalLinks = [
  ["Quiénes somos", "/quienes-somos"],
  ["Noticias", "/noticias"],
  ["Preguntas frecuentes", "/faq"],
  ["Contacto", "/contacto"],
  ["Mi cuenta", "/ingresar"],
] as const;

export function PublicMobileMenu({ coverageHref }: PublicMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <div className="mobile-public-menu">
      <button
        type="button"
        className="mobile-menu-toggle"
        aria-expanded={open}
        aria-controls="public-mobile-navigation"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="mobile-menu-icon" aria-hidden="true"><i /><i /><i /></span>
        <span>Menú</span>
      </button>
      {open && (
        <div id="public-mobile-navigation" className="mobile-menu-panel" role="navigation" aria-label="Navegación principal">
          <div>
            <p>DIRECTORIO</p>
            <Link href={coverageHref} onClick={closeMenu}>Regiones y ciudades</Link>
            {directoryLinks.map(([label, href]) => <Link href={href} onClick={closeMenu} key={href}>{label}</Link>)}
          </div>
          <div>
            <p>CHILE3X</p>
            {portalLinks.map(([label, href]) => <Link href={href} onClick={closeMenu} key={href}>{label}</Link>)}
          </div>
        </div>
      )}
    </div>
  );
}
