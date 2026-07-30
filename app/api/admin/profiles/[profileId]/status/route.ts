import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";

const allowedStatuses = new Set(["draft", "pending", "approved", "paused", "rejected", "expired"]);

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  if (!await getCurrentAdmin()) {
    return new Response("No autorizado.", { status: 401 });
  }

  const status = (await request.formData()).get("status");
  const { profileId } = await params;

  if (typeof status !== "string" || !allowedStatuses.has(status)) {
    return new Response("Estado no válido.", { status: 400 });
  }

  await (await getDb()).update(profiles).set({ status: status as typeof profiles.$inferInsert.status, updatedAt: new Date().toISOString() })
    .where(eq(profiles.id, profileId));

  return NextResponse.redirect(new URL("/admin/perfiles", request.url), 303);
}
