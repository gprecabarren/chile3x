import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { readAccountIdentity } from "@/lib/account-data";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/ingresar?return_to=/mi-cuenta/datos-personales", request.url), 303);

  const db = await getDb();
  const [current] = await db.select({ birthDate: users.birthDate }).from(users).where(eq(users.id, user.id)).limit(1);
  const formData = await request.formData();
  const displayNameInput = formData.get("display_name");
  const displayName = typeof displayNameInput === "string" ? displayNameInput.trim().slice(0, 80) : "";
  const identity = readAccountIdentity(formData);
  if (!current || !identity || identity.birthDate !== current.birthDate || displayName.length < 2) {
    return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=error", request.url), 303);
  }
  await db.update(users).set({
    displayName,
    firstName: identity.firstName || null,
    lastName: null,
    documentType: identity.documentType,
    documentNumber: identity.documentNumber,
    foreignCountry: identity.foreignCountry,
    city: identity.city,
    phone: identity.phone || null,
  }).where(eq(users.id, user.id));
  return NextResponse.redirect(new URL("/mi-cuenta/datos-personales?notice=saved", request.url), 303);
}
