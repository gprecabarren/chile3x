import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { permanentlyDeleteAccount } from "@/lib/account-deletion";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";
import { assertSameOrigin, getCurrentAdmin, safeAdminReturnTo } from "@/lib/auth";

function destination(request: Request, path: string, notice: string) {
  const url = new URL(path, request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  if (!adminHasCapability(admin, "accounts.manage")) return new Response("No tienes permiso para eliminar cuentas.", { status: 403 });
  const [{ userId }, formData] = await Promise.all([params, request.formData()]);
  const returnTo = safeAdminReturnTo(typeof formData.get("return_to") === "string" ? String(formData.get("return_to")) : null);
  if (userId === admin.id) return destination(request, returnTo, "delete_error");
  const [target] = await (await getDb()).select({ id: users.id, email: users.email, role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  const enteredEmail = typeof formData.get("email") === "string" ? String(formData.get("email")).trim().toLowerCase() : "";
  if (!target || target.role === "admin" || enteredEmail !== target.email.toLowerCase() || formData.get("confirmation") !== "ELIMINAR") {
    return destination(request, returnTo, "delete_confirmation");
  }

  const result = await permanentlyDeleteAccount(target.id, { kind: "admin", adminId: admin.id });
  if (!result) return destination(request, returnTo, "delete_error");
  await recordAdminAudit(admin, {
    category: "accounts",
    action: "account.delete_permanently",
    summary: "Eliminó permanentemente una cuenta de usuario y sus datos asociados.",
    entityType: "account_deletion",
    entityId: result.historyId,
    entityLabel: "Cuenta eliminada",
    before: { formerUserId: result.id, role: result.role },
    after: { deleted: true },
  });
  return destination(request, returnTo, "account_deleted");
}
