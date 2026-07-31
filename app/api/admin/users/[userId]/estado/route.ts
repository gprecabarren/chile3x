import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { authSessions, users } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";

function redirectWithNotice(request: Request, notice: string) {
  const url = new URL("/admin/cuentas", request.url);
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

  const [{ userId }, formData] = await Promise.all([params, request.formData()]);
  const nextState = formData.get("next_state");
  if ((nextState !== "active" && nextState !== "disabled") || userId === admin.id) return redirectWithNotice(request, "status_error");

  const db = await getDb();
  const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target || target.role === "admin") return redirectWithNotice(request, "status_error");

  const isActive = nextState === "active";
  await db.update(users).set({ isActive }).where(and(eq(users.id, userId), eq(users.role, target.role)));
  if (!isActive) {
    await db.delete(authSessions).where(eq(authSessions.userId, userId));
  }

  return redirectWithNotice(request, "status_updated");
}
