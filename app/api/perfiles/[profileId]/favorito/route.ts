import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { favorites } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";
import { getProfileEngagement, isPublicProfile } from "@/lib/profile-interactions";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para guardar favoritos." }, { status: 401 });

  const { profileId } = await params;
  if (!await isPublicProfile(profileId)) return NextResponse.json({ error: "El perfil ya no está disponible." }, { status: 404 });

  const db = await getDb();
  const [existing] = await db.select({ id: favorites.id }).from(favorites)
    .where(and(eq(favorites.profileId, profileId), eq(favorites.userId, user.id))).limit(1);

  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
  } else {
    await db.insert(favorites).values({ id: `fav_${crypto.randomUUID()}`, profileId, userId: user.id });
  }

  const engagement = await getProfileEngagement(profileId, user.id);
  return NextResponse.json({ saved: !existing, ...engagement });
}
