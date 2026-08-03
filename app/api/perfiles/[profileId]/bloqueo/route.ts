import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { blockedProfiles, profiles } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const user = await getCurrentUser();
  if (!user) return error("Inicia sesión para ocultar este anuncio.", 401);
  const { profileId } = await params;
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id, ownerId: profiles.ownerId }).from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return error("El anuncio no existe.", 404);
  if (profile.ownerId === user.id) return error("No puedes ocultar tu propio anuncio.", 400);
  await db.insert(blockedProfiles).values({ id: `block_${crypto.randomUUID()}`, userId: user.id, profileId }).onConflictDoNothing();
  return NextResponse.json({ blocked: true, message: "El anuncio quedó oculto de tu directorio." });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const user = await getCurrentUser();
  if (!user) return error("Inicia sesión para administrar tus anuncios ocultos.", 401);
  const { profileId } = await params;
  await (await getDb()).delete(blockedProfiles).where(and(eq(blockedProfiles.userId, user.id), eq(blockedProfiles.profileId, profileId)));
  return NextResponse.json({ blocked: false, message: "El anuncio volverá a aparecer en tu directorio." });
}
