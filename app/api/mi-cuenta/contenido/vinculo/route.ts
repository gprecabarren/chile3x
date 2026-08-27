import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { linkExclusiveContentToEscort } from "@/lib/exclusive-content";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 }); }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ingresa para administrar contenido." }, { status: 401 });
  try {
    const payload = await request.json() as { profileId?: string | null };
    const profileId = typeof payload.profileId === "string" && payload.profileId ? payload.profileId : null;
    const collection = await linkExclusiveContentToEscort(user.id, profileId);
    return NextResponse.json({ collection });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : "No se pudo actualizar el vínculo." }, { status: 400 });
  }
}
