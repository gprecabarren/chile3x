import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { profiles, profileViews } from "@/db/schema";
import { assertSameOrigin, createOpaqueToken } from "@/lib/auth";

const VIEWER_COOKIE = "chile3x_profile_viewer";
const VIEWER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function chileanDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    assertSameOrigin(request);
  } catch {
    return new Response("Solicitud no válida.", { status: 403 });
  }

  const { profileId } = await params;
  const [profile] = await (await getDb()).select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.status, "approved")))
    .limit(1);

  if (!profile) {
    return new Response(null, { status: 204 });
  }

  const existingViewerKey = request.cookies.get(VIEWER_COOKIE)?.value;
  const viewerKey = existingViewerKey && /^[A-Za-z0-9_-]{32,96}$/.test(existingViewerKey) ? existingViewerKey : createOpaqueToken();
  await (await getDb()).insert(profileViews).values({
    id: `view_${crypto.randomUUID()}`,
    profileId,
    viewerKey,
    viewedOn: chileanDay(),
  }).onConflictDoNothing();

  const response = new NextResponse(null, { status: 204 });
  if (!existingViewerKey) {
    response.cookies.set({ name: VIEWER_COOKIE, value: viewerKey, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: VIEWER_COOKIE_MAX_AGE });
  }
  return response;
}
