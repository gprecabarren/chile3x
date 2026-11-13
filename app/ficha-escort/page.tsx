import { ProfileForm } from "@/app/mi-cuenta/ProfileForm";
import { DirectoryShell } from "@/app/directorio/_components";
import { chileanDay } from "@/lib/chile-day";
import { privatePageMetadata } from "@/lib/seo";
import "./intake-form.css";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({
  title: "Envía tus datos para preparar tu anuncio",
  description: "Formulario privado de contacto para preparar un anuncio.",
  path: "/ficha-escort",
});

export default function Page() {
  return <DirectoryShell>
    <section className="sample-intake-page">
      <header className="sample-intake-heading">
        <h1>Envía tus datos para preparar tu anuncio</h1>
        <p>Completa los datos de tu perfil. El equipo de Chile3X recibirá tu ficha en privado y podrá contactarte para preparar el anuncio contigo.</p>
      </header>
      <ProfileForm travelToday={chileanDay()} action="/api/ficha-escort" submitLabel="Enviar ficha" sampleIntake />
    </section>
  </DirectoryShell>;
}
