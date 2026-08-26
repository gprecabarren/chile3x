import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { createAccountToken, sendAccountEmail } from "@/lib/account-email";
import { readAccountIdentity } from "@/lib/account-data";
import { assertSameOrigin, getCurrentAdmin, hashPassword, safeAdminReturnTo } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { getDb } from "@/db";
import { accountTokens, authSessions, users } from "@/db/schema";

function redirectWithNotice(request: Request, returnTo: string, notice: string) {
  const url = new URL(returnTo, request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });

  const [{ userId }, formData] = await Promise.all([params, request.formData()]);
  const fallback = `/admin/cuentas/${encodeURIComponent(userId)}`;
  const requestedReturnTo = formValue(formData, "return_to");
  const returnTo = requestedReturnTo.startsWith("/admin/cuentas/") ? safeAdminReturnTo(requestedReturnTo) : fallback;
  const action = formValue(formData, "action");
  const db = await getDb();
  const [target] = await db.select({
    id: users.id,
    role: users.role,
    email: users.email,
    displayName: users.displayName,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!target) return redirectWithNotice(request, "/admin/cuentas", "account_missing");
  if (target.id === admin.id || target.role === "admin") return redirectWithNotice(request, returnTo, "account_error");

  if (action === "send_reset") {
    const token = await createAccountToken(target.id, "reset_password");
    const delivered = await sendAccountEmail({ email: target.email, displayName: target.displayName, purpose: "reset_password", token });
    return redirectWithNotice(request, returnTo, delivered ? "reset_link_sent" : "reset_delivery_error");
  }

  if (action === "set_password") {
    const password = formValue(formData, "password");
    if (password.length < MIN_PASSWORD_LENGTH) return redirectWithNotice(request, returnTo, "password_invalid");
    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, target.id));
    await db.delete(authSessions).where(eq(authSessions.userId, target.id));
    await db.delete(accountTokens).where(and(eq(accountTokens.userId, target.id), eq(accountTokens.purpose, "reset_password")));
    return redirectWithNotice(request, returnTo, "password_updated");
  }

  if (action === "save_details") {
    const displayName = formValue(formData, "display_name").trim().slice(0, 80);
    const identity = readAccountIdentity(formData);
    if (displayName.length < 2 || !identity) return redirectWithNotice(request, returnTo, "details_invalid");
    if (identity.documentType === "rut" && identity.documentNumber) {
      const [duplicateRut] = await db.select({ id: users.id }).from(users).where(and(
        eq(users.documentType, "rut"),
        eq(users.documentNumber, identity.documentNumber),
        ne(users.id, target.id),
      )).limit(1);
      if (duplicateRut) return redirectWithNotice(request, returnTo, "duplicate_rut");
    }
    await db.update(users).set({
      displayName,
      firstName: identity.firstName || null,
      lastName: null,
      documentType: identity.documentType,
      documentNumber: identity.documentNumber,
      foreignCountry: identity.foreignCountry,
      birthDate: identity.birthDate,
      city: identity.city,
      phone: identity.phone || null,
    }).where(eq(users.id, target.id));
    return redirectWithNotice(request, returnTo, "details_saved");
  }

  return redirectWithNotice(request, returnTo, "account_error");
}
