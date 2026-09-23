import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { publicProfileCondition } from "@/lib/public-profile-visibility";
import { profileContactEvents, profiles } from "@/db/schema";
import { assertSameOrigin, createOpaqueToken, getCurrentUser } from "@/lib/auth";
import { describeUserAgent, sessionContextFromRequest } from "@/lib/session-context";

const VIEWER_COOKIE = "chile3x_profile_viewer";
const kinds = new Set(["whatsapp", "telegram", "call", "email", "instagram", "arsmate", "onlyfans", "videocall"]);
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
  const [db, user] = await Promise.all([getDb(), getCurrentUser()]);
  const [profile] = await db.select({ id: profiles.id }).from(profiles).where(and(eq(profiles.id, profileId), publicProfileCondition)).limit(1);
  if (!profile) return new Response(null, { status: 204 });
  const existing = request.cookies.get(VIEWER_COOKIE)?.value;
  const analyticsConsent = request.cookies.get("chile3x_analytics_consent")?.value === "granted";
  const viewerKey = existing && /^[A-Za-z0-9_-]{32,96}$/.test(existing) ? existing : createOpaqueToken();
  const context = sessionContextFromRequest(request);
  const device = describeUserAgent(context.userAgent).device;
  const deviceType = device === "Móvil" ? "mobile" : device === "Tablet" ? "tablet" : device === "Computador" ? "desktop" : "unknown";
  let referrerPath: string | null = null;
  try {
    const referrer = new URL(request.headers.get("referer") ?? "");
    if (referrer.origin === new URL(request.url).origin) referrerPath = `${referrer.pathname}${referrer.search}`.slice(0, 300);
  } catch { /* The referrer is optional. */ }
  await db.insert(profileContactEvents).values({
    id: `contact_${crypto.randomUUID()}`,
    profileId,
    viewerKey,
    viewerUserId: analyticsConsent ? user?.id ?? null : null,
    kind: payload.kind as typeof profileContactEvents.$inferInsert.kind,
    clickedOn: chileanDay(),
    countryCode: analyticsConsent ? context.countryCode : null,
    region: analyticsConsent ? context.region : null,
    city: analyticsConsent ? context.city : null,
    deviceType: analyticsConsent ? deviceType : "unknown",
    referrerPath: analyticsConsent ? referrerPath : null,
  }).onConflictDoUpdate({
    target: [profileContactEvents.profileId, profileContactEvents.viewerKey, profileContactEvents.kind, profileContactEvents.clickedOn],
    set: {
      ...(analyticsConsent ? {
        viewerUserId: user?.id ?? null,
        countryCode: context.countryCode,
        region: context.region,
        city: context.city,
        deviceType,
        referrerPath,
      } : {}),
    },
  });
  const response = new NextResponse(null, { status: 204 });
  if (!existing) response.cookies.set({ name: VIEWER_COOKIE, value: viewerKey, httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
