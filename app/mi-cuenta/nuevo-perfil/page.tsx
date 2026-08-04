import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AccountHeading, AccountShell } from "../_components";
import { ProfileForm } from "../ProfileForm";

export const dynamic = "force-dynamic";

export default async function NewProfilePage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/ingresar?return_to=/mi-cuenta/nuevo-perfil");
  }
  const params = await searchParams;

  return (
    <AccountShell user={user}>
      <div className="account-content"><a className="page-back-link" href="/mi-cuenta">← Volver a mi cuenta</a>
        <AccountHeading eyebrow="NUEVA PUBLICACIÓN" title="Crea tu perfil" description="Completa la información esencial. Las publicaciones no aparecen públicamente hasta que el equipo las revise." />
        {params.error && <p className="form-alert" role="alert">{params.message ?? "Revisa la información del formulario. La región, ciudad y contacto deben ser válidos."}</p>}
        <ProfileForm action="/api/perfiles/nuevo" submitLabel="Enviar a revisión" />
      </div>
    </AccountShell>
  );
}
