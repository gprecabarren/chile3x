import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin, hashPassword } from "@/lib/auth";

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

  if (!await getCurrentAdmin()) {
    return new Response("No autorizado.", { status: 401 });
  }

  const formData = await request.formData();
  const displayName = formValue(formData, "display_name").trim().slice(0, 80);
  const email = formValue(formData, "email").trim().toLowerCase().slice(0, 160);
  const password = formValue(formData, "password");

  if (formData.get("adult_verified") !== "yes" || displayName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    return redirectWithNotice(request, "invalid");
  }

  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return redirectWithNotice(request, "duplicate");
  }

  await db.insert(users).values({
    id: `usr_${crypto.randomUUID()}`,
    email,
    displayName,
    passwordHash: await hashPassword(password),
    role: "advertiser",
    emailVerifiedAt: new Date().toISOString(),
  });

  return redirectWithNotice(request, "created");
}
