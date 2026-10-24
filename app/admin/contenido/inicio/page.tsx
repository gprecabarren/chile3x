import {redirect} from "next/navigation";
import {getCurrentAdmin} from "@/lib/auth";
import {adminHasCapability} from "@/lib/admin-permissions";
import {getSiteSettings} from "@/lib/site-settings";
import {parseHomeTexts} from "@/lib/home-content-policy";
import {currentRevision} from "@/lib/collaboration";
import {AdminShell,AdminPageHeading} from "../../_components";
import {ReviewScope} from "../../ReviewScope";
import {HomeTextEditor} from "./HomeTextEditor";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{saved?:string}>}) {
  const admin=await getCurrentAdmin();if(!admin)redirect("/api/auth/github/start?return_to=/admin/contenido/inicio");if(!adminHasCapability(admin,"settings.manage"))redirect("/admin/acceso-denegado?reason=permission");
  const [settings,revision,query]=await Promise.all([getSiteSettings(),currentRevision("settings:site"),searchParams]);
  return <AdminShell user={admin}><div className="admin-content"><ReviewScope resource="settings:site" revision={revision??0}><AdminPageHeading eyebrow="CONTENIDO Y BUSCADORES" title="Textos y SEO de los home" description="Edita las dos versiones de la portada sin cambiar código ni crear URLs duplicadas. La selección del diseño y del tema sigue en Testing." backHref="/admin/contenido"/>{query.saved==="1"&&<p className="admin-success" role="status">Textos y SEO guardados.</p>}<HomeTextEditor classic={parseHomeTexts(settings.home_content_classic,"classic")} compact={parseHomeTexts(settings.home_content_compact,"compact")} revision={revision??0}/></ReviewScope></div></AdminShell>;
}
