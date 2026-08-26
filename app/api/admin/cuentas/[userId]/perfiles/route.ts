import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { createProfile, ProfileValidationError, readProfileSubmission } from "@/lib/profile-submission";

function destinationFor(userId: string, email: string, request: Request) {
  const url = new URL("/admin/perfiles", request.url);
  url.searchParams.set("q", email);
  url.searchParams.set("return_to", `/admin/cuentas/${encodeURIComponent(userId)}`);
  return url;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  if (!await getCurrentAdmin()) return new Response("No autorizado.", { status: 401 });

  const [{ userId }, formData] = await Promise.all([params, request.formData()]);
  const db = await getDb();
  const [owner] = await db.select({ id: users.id, email: users.email, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!owner || owner.role === "admin" || !owner.isActive) {
    const url = new URL(`/admin/cuentas/${encodeURIComponent(userId)}`, request.url);
    url.searchParams.set("notice", "account_error");
    return NextResponse.redirect(url, 303);
  }

  try {
    const submission = readProfileSubmission(formData);
    await createProfile(owner.id, submission);
    const url = destinationFor(owner.id, owner.email, request);
    url.searchParams.set("notice", "profile_created");
    return NextResponse.redirect(url, 303);
  } catch (error) {
    const url = new URL(`/admin/cuentas/${encodeURIComponent(userId)}/crear-perfil`, request.url);
    url.searchParams.set("error", error instanceof ProfileValidationError ? "validation" : "server");
    url.searchParams.set("message", error instanceof ProfileValidationError ? error.message : "No se pudo guardar el aviso. Revisa los campos e inténtalo nuevamente.");
    return NextResponse.redirect(url, 303);
  }
}
