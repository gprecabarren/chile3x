import { ProfileForm } from "@/app/mi-cuenta/ProfileForm";
import { DirectoryShell } from "@/app/directorio/_components";
import { chileanDay } from "@/lib/chile-day";
import { privatePageMetadata } from "@/lib/seo";
import "../muestra/samples.css";

export const dynamic = "force-dynamic";
export const metadata = privatePageMetadata({
  title: "Envía tus datos para preparar tu anuncio",
  description: "Formulario privado de contacto para preparar un anuncio.",
  path: "/ficha-escort",
});

export default function Page() {
  return <DirectoryShell>
    <section className="samples-admin-content sample-intake-page">
      <header>
        <h1>Envía tus datos para preparar tu anuncio</h1>
        <p>El equipo de Chile3X recibirá tu ficha y podrá contactarte para revisarla contigo. En este paso solo necesitas enviar los datos del perfil.</p>
      </header>
      <ProfileForm travelToday={chileanDay()} action="/api/ficha-escort" submitLabel="Enviar ficha" sampleIntake />
    </section>
  </DirectoryShell>;
}
