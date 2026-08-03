import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileExclusiveAccess, profiles, users } from "@/db/schema";
import { assertSameOrigin, getCurrentUser } from "@/lib/auth";

function error(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }
async function ownedProfile(profileId: string, userId: string) {
  const [profile] = await (await getDb()).select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.ownerId, userId))).limit(1);
  return Boolean(profile);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const owner = await getCurrentUser(); if (!owner) return error("Inicia sesión.", 401);
  const { profileId } = await params; if (!await ownedProfile(profileId, owner.id)) return error("No autorizado.", 403);
  const payload = await request.json().catch(() => null) as { email?: string } | null;
  const email = payload?.email?.trim().toLowerCase().slice(0, 254) ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email)) return error("Ingresa un correo válido.", 400);
  const db = await getDb();
  const [user] = await db.select({ id: users.id, email: users.email, displayName: users.displayName }).from(users).where(eq(users.email, email)).limit(1);
  if (!user || user.id === owner.id) return error("No encontramos otra cuenta activa con ese correo.", 404);
  await db.insert(profileExclusiveAccess).values({ id: `exclusive_${crypto.randomUUID()}`, profileId, userId: user.id, grantedBy: owner.id }).onConflictDoNothing();
  return NextResponse.json({ grant: { userId: user.id, email: user.email, displayName: user.displayName } }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return error("Solicitud no válida.", 403); }
  const owner = await getCurrentUser(); if (!owner) return error("Inicia sesión.", 401);
  const { profileId } = await params; if (!await ownedProfile(profileId, owner.id)) return error("No autorizado.", 403);
  const payload = await request.json().catch(() => null) as { userId?: string } | null;
  if (!payload?.userId) return error("Falta la cuenta.", 400);
  await (await getDb()).delete(profileExclusiveAccess).where(and(eq(profileExclusiveAccess.profileId, profileId), eq(profileExclusiveAccess.userId, payload.userId)));
  return NextResponse.json({ removed: true });
}
