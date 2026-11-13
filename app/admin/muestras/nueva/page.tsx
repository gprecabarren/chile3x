import { chileanDay } from "@/lib/chile-day";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { privateSampleIntakes } from "@/db/schema";
import {redirect} from "next/navigation";
import {getCurrentAdmin} from "@/lib/auth";
import {canManageSamples, sampleInitial} from "@/lib/private-samples";
import { SAMPLE_INTAKE_ID, SAMPLE_INTAKES_ADMIN_PATH } from "@/lib/private-sample-policy";
import {ProfileForm} from "@/app/mi-cuenta/ProfileForm";
import {privatePageMetadata} from "@/lib/seo";
import {AdminShell,AdminPageHeading} from "../../_components";
export const dynamic="force-dynamic";
export const metadata=privatePageMetadata({title:"Crear muestra privada",description:"Preparación privada de una muestra sin crear cuentas ni anuncios públicos.",path:"/admin/muestras/nueva"});
export default async function Page({ searchParams }: { searchParams: Promise<{ ficha?: string }> }) {
  const admin=await getCurrentAdmin();if(!admin)redirect("/api/auth/github/start?return_to=/admin/muestras/nueva");if(!canManageSamples(admin))redirect("/admin/acceso-denegado?reason=permission");
  const { ficha } = await searchParams;
  const [intake] = ficha && SAMPLE_INTAKE_ID.test(ficha)
    ? await (await getDb()).select().from(privateSampleIntakes).where(eq(privateSampleIntakes.id, ficha)).limit(1)
    : [];
  if (ficha && (!intake || intake.processedAt)) redirect(intake?.sampleId ? `/admin/muestras/${intake.sampleId}` : SAMPLE_INTAKES_ADMIN_PATH);
  return <AdminShell user={admin}><div className="admin-content samples-admin-content">
    <AdminPageHeading eyebrow="SOLO ADMINISTRACIÓN" title={intake ? "Preparar muestra desde la ficha" : "Crear muestra privada"} description="Revisa los datos y añade las fotos después de guardar." backHref={intake ? SAMPLE_INTAKES_ADMIN_PATH : "/admin/muestras"} />
    {intake?.accountEmail && <section className="sample-admin-card"><h2>Correo para la futura cuenta</h2><p>{intake.accountEmail}</p><small>Dato privado de la ficha recibida.</small></section>}
    <ProfileForm travelToday={chileanDay()} action="/api/admin/muestras" submitLabel="Guardar muestra privada" intakeId={intake?.id} initial={intake ? sampleInitial(intake) : undefined} sampleProvenance="otros" privateSample adminEdit />
  </div></AdminShell>;
}
