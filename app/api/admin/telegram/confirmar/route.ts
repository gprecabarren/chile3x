import { NextRequest, NextResponse } from "next/server";
import { assertSameOrigin, getCurrentAdmin } from "@/lib/auth";
import { confirmTelegramLink } from "@/lib/telegram-linking";
import { recordAdminAudit } from "@/lib/admin-audit";

export async function POST(request: NextRequest) {
  try { assertSameOrigin(request); } catch { return new Response("Solicitud no válida.", { status: 403 }); }
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("No autorizado.", { status: 401 });
  const confirmed = await confirmTelegramLink(admin, "admin");
  if (confirmed) await recordAdminAudit(admin, {
    category: "telegram",
    action: "telegram.link_admin",
    summary: "Vinculó su identidad administrativa de Telegram.",
    entityType: "telegram_member",
    entityId: confirmed.attempt.candidateTelegramUserId,
    entityLabel: confirmed.attempt.candidateUsername ? `@${confirmed.attempt.candidateUsername}` : "Identidad de Telegram",
  });
  return NextResponse.redirect(new URL(`/admin/telegram?notice=${confirmed ? "admin_linked" : "confirmation_error"}`, request.url), 303);
}
