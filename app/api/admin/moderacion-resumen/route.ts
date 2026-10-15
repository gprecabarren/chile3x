import { getCurrentAdmin } from "@/lib/auth";
import { adminHasCapability } from "@/lib/admin-permissions";
import { getModerationInbox } from "@/lib/moderation-inbox";
export async function GET() {
  const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
  const admin = await getCurrentAdmin();
  if (!admin) return Response.json({ error: "Tu sesión administrativa terminó." }, { status: 401, headers });
  if (!adminHasCapability(admin, "profiles.moderate") && !adminHasCapability(admin, "media.moderate")) return Response.json({ error: "No tienes permiso para consultar la moderación." }, { status: 403, headers });
  return Response.json(await getModerationInbox(admin), { headers });
}
