import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Chile3X | Directorio adulto en todo Chile",
    template: "%s | Chile3X",
  },
  description:
    "Directorio para adultos con perfiles, agencias y arriendos en las 16 regiones y ciudades iniciales de Chile.",
  openGraph: {
    title: "Chile3X | Directorio adulto en todo Chile",
    description:
      "Perfiles, agencias y arriendos en las 16 regiones y ciudades iniciales de Chile.",
    type: "website",
    locale: "es_CL",
    images: [
      {
        url: "/chile3x-social-card.png",
        width: 1734,
        height: 907,
        alt: "Chile3X — directorio para adultos en Chile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chile3X | Directorio adulto en todo Chile",
    description:
      "Perfiles, agencias y arriendos en las 16 regiones y ciudades iniciales de Chile.",
    images: ["/chile3x-social-card.png"],
  },
  icons: {
    icon: "/chile3x-logo-primary.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
