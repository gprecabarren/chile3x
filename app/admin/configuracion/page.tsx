import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { siteSettings } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminPageHeading, AdminShell } from "../_components";

export const dynamic = "force-dynamic";

const defaults = {
  listing_open: "closed",
  moderation_mode: "manual",
  billing_mode: "manual",
};

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/api/auth/github/start?return_to=/admin/configuracion");
  }

  const settings = await (await getDb()).select().from(siteSettings);
  const values = settings.reduce<Record<string, string>>((result, setting) => {
    result[setting.key] = setting.value;
    return result;
  }, { ...defaults });
  const params = await searchParams;

  return (
    <AdminShell user={admin}>
      <div className="admin-content">
        <AdminPageHeading
          eyebrow="CONFIGURACIÓN DEL PORTAL"
          title="Reglas de operación"
          description="Ajustes iniciales del MVP. Los cobros siguen fuera del flujo automático y los avisos no se publican sin revisión."
        />
        {params.saved === "1" && <p className="admin-success" role="status">Configuración guardada.</p>}
        <form action="/api/admin/settings" method="post" className="admin-settings-form">
          <label>
            Apertura de perfiles nuevos
            <select name="listing_open" defaultValue={values.listing_open}>
              <option value="closed">Cerrada: solo el equipo crea perfiles</option>
              <option value="waitlist">Lista de espera: se reciben solicitudes</option>
              <option value="open">Abierta: se pueden iniciar borradores</option>
            </select>
          </label>
          <label>
            Publicación de avisos
            <select name="moderation_mode" defaultValue={values.moderation_mode}>
              <option value="manual">Manual: todos requieren aprobación</option>
              <option value="manual_priority">Manual con prioridad para avisos verificados</option>
            </select>
          </label>
          <label>
            Cobros y planes
            <select name="billing_mode" defaultValue={values.billing_mode}>
              <option value="manual">Manual: sin pagos integrados</option>
              <option value="planned">Preparado para evaluación futura</option>
            </select>
          </label>
          <button className="button button-primary" type="submit">Guardar configuración</button>
        </form>
      </div>
    </AdminShell>
  );
}
