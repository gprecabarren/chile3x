import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileCityAlerts, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { getProfileAlertCities } from "@/lib/profile-city-alerts";

type AlertRequest = { city?: unknown; intent?: unknown };

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para crear este aviso." }, { status: 401 });

  const { profileId } = await params;
  const payload = await request.json().catch(() => null) as AlertRequest | null;
  const city = typeof payload?.city === "string" ? payload.city.trim() : "";
  const intent = payload?.intent === "remove" ? "remove" : "create";
  if (!city || city.length > 80) return NextResponse.json({ error: "Selecciona una ciudad válida." }, { status: 400 });

  const db = await getDb();
  const [profile] = await db.select({ ownerId: profiles.ownerId, type: profiles.type, status: profiles.status, city: profiles.city })
    .from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile || profile.type !== "escort" || profile.status !== "approved") {
    return NextResponse.json({ error: "Este anuncio no admite avisos de ciudad." }, { status: 404 });
  }
  if (profile.ownerId === user.id) {
    return NextResponse.json({ error: "No puedes crear avisos para tu propio anuncio." }, { status: 403 });
  }

  if (intent === "remove") {
    await db.delete(profileCityAlerts).where(and(
      eq(profileCityAlerts.profileId, profileId),
      eq(profileCityAlerts.userId, user.id),
      eq(profileCityAlerts.city, city),
    ));
    return NextResponse.json({ city, removed: true, message: `Aviso para ${city} eliminado.` });
  }

  if (city === profile.city) {
    return NextResponse.json({ error: `Este anuncio ya está publicado en ${city}.` }, { status: 409 });
  }
  const availableCities = await getProfileAlertCities();
  if (!availableCities.includes(city)) {
    return NextResponse.json({ error: "La ciudad seleccionada ya no está disponible en el directorio." }, { status: 400 });
  }

  await db.insert(profileCityAlerts).values({
    id: `pca_${crypto.randomUUID()}`,
    profileId,
    userId: user.id,
    city,
  }).onConflictDoUpdate({
    target: [profileCityAlerts.profileId, profileCityAlerts.userId, profileCityAlerts.city],
    set: { notifiedAt: null, createdAt: new Date().toISOString() },
  });

  return NextResponse.json({ city, saved: true, message: `Te avisaremos si este anuncio llega a ${city}.` });
}
