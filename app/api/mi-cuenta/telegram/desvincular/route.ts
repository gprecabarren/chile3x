import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { revokeTelegramAccountLink } from "@/lib/telegram-linking";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const user = await getCurrentUser();
  if (!user || user.role === "admin") return new Response("No autorizado.", { status: 401 });
  const formData = await request.formData();
  if (formData.get("confirmation") !== "DESVINCULAR") return NextResponse.redirect(new URL("/mi-cuenta/telegram?notice=unlink_confirmation", request.url), 303);
  const job = await revokeTelegramAccountLink(user.id, "Vínculo retirado por la persona desde Mi cuenta.");
  return NextResponse.redirect(new URL(`/mi-cuenta/telegram?notice=${job ? "unlinked" : "unlink_error"}`, request.url), 303);
}
