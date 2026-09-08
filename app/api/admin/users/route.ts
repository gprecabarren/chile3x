import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin, hashPassword } from "@/lib/auth";
import { readAccountIdentity } from "@/lib/account-data";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";
import { generateUniqueAccountUsername } from "@/lib/account-username";
import { recordAdminAudit } from "@/lib/admin-audit";
import { adminHasCapability } from "@/lib/admin-permissions";

function redirectWithNotice(request: Request, notice: string) {
  const url = new URL("/admin/cuentas", request.url);
  url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    return new Response("No autorizado.", { status: 401 });
  }
  if (!adminHasCapability(admin, "accounts.manage")) return new Response("No tienes permiso para administrar cuentas.", { status: 403 });

  const formData = await request.formData();
  const displayName = formValue(formData, "display_name").trim().slice(0, 80);
  const email = formValue(formData, "email").trim().toLowerCase().slice(0, 160);
  const password = formValue(formData, "password");
  const role = formValue(formData, "role");
  const identity = readAccountIdentity(formData);

  if (formData.get("adult_verified") !== "yes" || displayName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < MIN_PASSWORD_LENGTH || !identity || !["advertiser", "tester"].includes(role)) {
    return redirectWithNotice(request, "invalid");
  }

  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return redirectWithNotice(request, "duplicate");
  }
  if (identity.documentType === "rut" && identity.documentNumber) {
    const [existingRut] = await db.select({ id: users.id }).from(users).where(and(eq(users.documentType, "rut"), eq(users.documentNumber, identity.documentNumber))).limit(1);
    if (existingRut) return redirectWithNotice(request, "duplicate_rut");
  }

  const username = await generateUniqueAccountUsername(displayName);
  const userId = `usr_${crypto.randomUUID()}`;
  await db.insert(users).values({
    id: userId,
    email,
    username,
    displayName,
    passwordHash: await hashPassword(password),
    role: role as "advertiser" | "tester",
    emailVerifiedAt: new Date().toISOString(),
    firstName: identity.firstName || null,
    lastName: null,
    documentType: identity.documentType,
    documentNumber: identity.documentNumber,
    foreignCountry: identity.foreignCountry,
    birthDate: identity.birthDate,
    city: identity.city,
    phone: identity.phone || null,
  });
  await recordAdminAudit(admin, { category: "accounts", action: "account.create", summary: `Creó la cuenta ${displayName} (${email}).`, entityType: "account", entityId: userId, entityLabel: displayName, after: { email, username, displayName, role, documentType: identity.documentType, city: identity.city, isActive: true } });

  return redirectWithNotice(request, "created");
}
