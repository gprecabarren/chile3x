import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Chile3X | Adultos, agencias y arriendos en Chile",
    template: "%s | Chile3X",
  },
  description:
    "Directorio para adultos con perfiles verificados, agencias y arriendos en todo Chile.",
  openGraph: {
    title: "Chile3X | Adultos, agencias y arriendos en Chile",
    description:
      "Directorio para adultos con perfiles verificados, agencias y arriendos en todo Chile.",
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
    title: "Chile3X | Adultos, agencias y arriendos en Chile",
    description:
      "Directorio para adultos con perfiles verificados, agencias y arriendos en todo Chile.",
    images: ["/chile3x-social-card.png"],
  },
  icons: {
    icon: "/chile3x-logo-dark.jpeg",
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
