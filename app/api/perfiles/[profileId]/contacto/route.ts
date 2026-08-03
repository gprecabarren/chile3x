import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profileContactEvents, profiles } from "@/db/schema";
import { assertSameOrigin, createOpaqueToken } from "@/lib/auth";

const VIEWER_COOKIE = "chile3x_profile_viewer";
const kinds = new Set(["whatsapp", "telegram", "call", "email", "instagram", "arsmate", "videocall"]);
function chileanDay() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try { assertSameOrigin(request); } catch { return new Response(null, { status: 403 }); }
  const payload = await request.json().catch(() => null) as { kind?: string } | null;
  if (!payload?.kind || !kinds.has(payload.kind)) return new Response(null, { status: 400 });
  const { profileId } = await params;
  const db = await getDb();
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.status, "approved"))).limit(1);
  if (!profile) return new Response(null, { status: 204 });
  const existing = request.cookies.get(VIEWER_COOKIE)?.value;
  const viewerKey = existing && /^[A-Za-z0-9_-]{32,96}$/.test(existing) ? existing : createOpaqueToken();
  await db.insert(profileContactEvents).values({ id: `contact_${crypto.randomUUID()}`, profileId, viewerKey, kind: payload.kind as typeof profileContactEvents.$inferInsert.kind, clickedOn: chileanDay() }).onConflictDoNothing();
  const response = new NextResponse(null, { status: 204 });
  if (!existing) response.cookies.set({ name: VIEWER_COOKIE, value: viewerKey, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
