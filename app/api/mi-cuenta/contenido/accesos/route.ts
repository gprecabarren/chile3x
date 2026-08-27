import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { addExclusiveContentAccess, removeExclusiveContentAccess } from "@/lib/exclusive-content";

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const user = await getCurrentUser();
  if (!user) return error("Ingresa para administrar contenido.", 401);
  try {
    const payload = await request.json() as { identifier?: string };
    const identifier = typeof payload.identifier === "string" ? payload.identifier.trim() : "";
    if (!identifier || identifier.length > 160) return error("Indica el correo o nombre de usuario de una cuenta.");
    const grant = await addExclusiveContentAccess(user.id, identifier);
    return NextResponse.json({ grant }, { status: 201 });
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : "No se pudo autorizar la cuenta.");
  }
}

export async function DELETE(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const user = await getCurrentUser();
  if (!user) return error("Ingresa para administrar contenido.", 401);
  try {
    const payload = await request.json() as { userId?: string };
    if (!payload.userId || payload.userId.length > 80) return error("Cuenta no válida.");
    await removeExclusiveContentAccess(user.id, payload.userId);
    return NextResponse.json({ ok: true });
  } catch {
    return error("No se pudo retirar el acceso.");
  }
}
