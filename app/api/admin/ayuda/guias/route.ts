import { NextRequest, NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { helpGuides } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { recordAdminAudit } from "@/lib/admin-audit";
import { readHelpGuide } from "@/lib/help-guide-policy";
import { readTextForm } from "@/lib/form-body";

const headers = { "cache-control":"private, no-store", "x-robots-tag":"noindex, nofollow" };
export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({error:"Solicitud no válida."},{status:403,headers}); }
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({error:"Inicia sesión como administrador."},{status:401,headers});
  if (!adminHasCapability(admin,"settings.manage")) return NextResponse.json({error:"No tienes permiso para administrar las guías."},{status:403,headers});
  try {
    const form = await readTextForm(request); const intent = String(form.get("intent")??"");
    const db=await getDb(), now=new Date().toISOString(); let id=String(form.get("id")??"");
    if (!["create","update","delete","restore"].includes(intent)) throw new Error("Operación no válida.");
    if (intent==='create') {
      const [total]=await db.select({value:count()}).from(helpGuides); if (Number(total.value)>=300) throw new Error("Se alcanzó el límite de 300 guías. Actualiza una guía existente antes de ampliar el catálogo.");
      id=`help_${crypto.randomUUID()}`;
      await db.insert(helpGuides).values({id,...readHelpGuide(form),updatedBy:admin.id,updatedAt:now});
    } else {
      const [existing]=await db.select().from(helpGuides).where(eq(helpGuides.id,id)).limit(1);
      if (!existing) return NextResponse.json({error:"La guía ya no existe. Recarga la página."},{status:404,headers});
      if (String(form.get("version")??"")!==existing.updatedAt) return NextResponse.json({error:"Otro administrador modificó esta guía. Recarga antes de guardar."},{status:409,headers});
      const changed=await db.update(helpGuides).set(intent==='update'?{...readHelpGuide(form),updatedAt:now,updatedBy:admin.id}:{isDeleted:intent==='delete',updatedAt:now,updatedBy:admin.id})
        .where(and(eq(helpGuides.id,id),eq(helpGuides.updatedAt,existing.updatedAt))).returning({id:helpGuides.id});
      if (!changed.length) return NextResponse.json({error:"La guía cambió durante el guardado. Recarga."},{status:409,headers});
    }
    const action = intent==='create'?'help.guide_create':intent==='update'?'help.guide_update':intent==='delete'?'help.guide_delete':'help.guide_restore';
    await recordAdminAudit(admin,{category:"settings",action,entityType:"settings",entityId:id,summary:`${intent==='create'?'Creó':intent==='update'?'Actualizó':intent==='delete'?'Retiró':'Restauró'} una guía del centro de ayuda.`});
    return NextResponse.json({redirectTo:`/admin/ayuda/guias?id=${encodeURIComponent(id)}&notice=${intent}`},{headers});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:"No se pudo guardar la guía."},{status:400,headers}); }
}
