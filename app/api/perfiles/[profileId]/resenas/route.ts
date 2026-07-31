import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { reviews } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { isPublicProfile } from "@/lib/profile-interactions";
import { expectedTurnstileHostnames, TURNSTILE_PROFILE_REVIEW_ACTION } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

type TurnstileResult = { success?: boolean; action?: string; hostname?: string };

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

  const expectedHostnames = expectedTurnstileHostnames(request.url);
  const { env } = await import("cloudflare:workers");
  if (typeof token !== "string" || token.length === 0 || token.length > 2048 || expectedHostnames.size === 0 || !env.TURNSTILE_SECRET) {
    return error("No fue posible validar la protección antispam. Inténtalo nuevamente.", 403);
  }

  let result: TurnstileResult;
  try {
    const remoteip = request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, ...(remoteip ? { remoteip } : {}) }),
    });
    if (!response.ok) throw new Error(`siteverify ${response.status}`);
    result = await response.json() as TurnstileResult;
  } catch {
    return error("No fue posible validar la protección antispam. Inténtalo nuevamente.", 403);
  }
  if (!result.success || result.action !== TURNSTILE_PROFILE_REVIEW_ACTION || !result.hostname || !expectedHostnames.has(result.hostname)) {
    return error("La verificación antispam no fue válida. Vuelve a intentarlo.", 403);
  }

  await (await getDb()).insert(reviews).values({ id: `rev_${crypto.randomUUID()}`, authorId: user.id, profileId, body, status: "pending" });
  return NextResponse.json({ message: "Gracias. Tu reseña quedó enviada a moderación antes de publicarse." }, { status: 201 });
}
