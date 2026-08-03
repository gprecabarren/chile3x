import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { reviews } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { isPublicProfile } from "@/lib/profile-interactions";
import { TURNSTILE_PROFILE_REVIEW_ACTION } from "@/lib/turnstile";
import { verifyTurnstile } from "@/lib/turnstile-server";

export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return error("Solicitud no válida.", 403);
  }
  const user = await getCurrentUser();
  if (!user) return error("Inicia sesión para dejar una reseña.", 401);

  const formData = await request.formData();
  const body = typeof formData.get("body") === "string" ? String(formData.get("body")).trim().replace(/\s+/g, " ") : "";
  const token = formData.get("cf-turnstile-response");
  const { profileId } = await params;
  if (body.length < 3 || body.length > 700) return error("La reseña debe tener entre 3 y 700 caracteres.", 400);
  if (!await isPublicProfile(profileId)) return error("El perfil ya no está disponible.", 404);

  if (!await verifyTurnstile(request, token, TURNSTILE_PROFILE_REVIEW_ACTION)) {
    return error("La verificación antispam no fue válida. Vuelve a intentarlo.", 403);
  }

  await (await getDb()).insert(reviews).values({ id: `rev_${crypto.randomUUID()}`, authorId: user.id, profileId, body, status: "pending" });
  return NextResponse.json({ message: "Gracias. Tu reseña quedó enviada a moderación antes de publicarse." }, { status: 201 });
}
