import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentAdmin, safeAdminReturnTo } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { permanentlyDeleteTrashedProfile, restoreProfile, trashProfile } from "@/lib/profile-trash";

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "profiles.recycle")) return new Response("No tienes permiso para usar la papelera.", { status: 403 });
  const [{ profileId }, formData] = await Promise.all([params, request.formData()]);
  const action = formData.get("action");
  const returnTo = safeAdminReturnTo(typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : null);
  if (action !== "trash" && action !== "restore" && action !== "delete") return new Response("Acción no válida.", { status: 400 });
  const expectedConfirmation = action === "trash" ? "PAPELERA" : action === "restore" ? "RESTAURAR" : "ELIMINAR DEFINITIVAMENTE";
  if (formData.get("confirmation") !== expectedConfirmation) return new Response("Confirma la acción escribiendo la palabra indicada.", { status: 400 });
  const result = action === "trash" ? await trashProfile(profileId, admin, "admin") : action === "restore" ? await restoreProfile(profileId, admin) : await permanentlyDeleteTrashedProfile(profileId, admin);
  const destination = new URL(returnTo, request.url);
  destination.searchParams.set("notice", result === "ok" ? action === "trash" ? "trashed" : action === "restore" ? "restored" : "deleted" : result);
  return NextResponse.redirect(destination, 303);
}
